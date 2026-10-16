/// <reference types="bun" />
import { expect, mock, spyOn, test } from "bun:test";
import type { LiveEvent } from "./types";

const api = mock(async (_path: string, _init: RequestInit) => ({ token: "fixture", model: "models/test" }));
class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
const recorder = { clearOnAudioReady: mock(() => {}), stop: mock(() => {}) };
mock.module("react-native-audio-api", () => ({ AudioContext: class {} }));
mock.module("@/utils/api", () => ({ api, ApiError }));
mock.module("@/utils/recorder", () => ({ getRecorder: () => recorder }));
const { GeminiEngine } = await import("./gemini-engine");
const setup = { mode: "TITLE" as const, domain: "Data & AI", panelists: 1, minutes: 10, followUps: 2, difficulty: "STANDARD" as const };
type Internals = {
  emit: (e: LiveEvent) => void;
  ready: boolean;
  ws: { send: (data: string) => void; close: () => void } | null;
  handle: string | null;
  connected: boolean;
  studentFloor: boolean;
  activity: boolean;
  connect: () => Promise<void>;
  retry: () => void;
  onToolCall: (call: object) => { response: { allowed?: boolean } };
};

test("expiry closes the active mic turn, refuses questions and finishes even if the panel stays silent", () => {
  const engine = new GeminiEngine(setup);
  const internals = engine as unknown as Internals;
  const events: LiveEvent[] = [];
  const sent: any[] = [];
  internals.emit = (e) => events.push(e);
  internals.ready = true;
  internals.studentFloor = true;
  internals.activity = true;
  internals.ws = { send: (data) => sent.push(JSON.parse(data)), close: () => {} };
  const jobs: { run: () => void; ms: number }[] = [];
  const timers = spyOn(globalThis, "setTimeout").mockImplementation(((run: () => void, ms: number) => {
    jobs.push({ run, ms });
    return jobs.length;
  }) as typeof setTimeout);
  try {
    engine.endForTime();
    engine.endForTime();
    expect(sent[0]).toEqual({ realtimeInput: { activityEnd: {} } });
    expect(sent[1].clientContent.turns[0].parts[0].text).toContain("time limit");
    expect(internals.studentFloor).toBe(false);
    expect(internals.onToolCall({ name: "ask_question", id: "q" }).response.allowed).toBe(false);
    expect(events.filter((e) => e.type === "end")).toEqual([{ type: "end", reason: "time" }]);
    expect(jobs.filter((j) => j.ms === 8000)).toHaveLength(1);
    internals.retry(); // reconnect clears the ordinary timer, never the closing deadline
    jobs.find((j) => j.ms === 8000)!.run();
    expect(events.filter((e) => e.type === "ended")).toHaveLength(1);
    expect(recorder.stop).toHaveBeenCalled();
  } finally {
    engine.stop();
    timers.mockRestore();
  }
});

test("the same start ID is sent on retries and resumption; quota errors stop retrying", async () => {
  const engine = new GeminiEngine(setup);
  const internals = engine as unknown as Internals;
  const events: LiveEvent[] = [];
  internals.emit = (e) => events.push(e);
  const failure = spyOn(globalThis, "setTimeout").mockImplementation((() => 1) as unknown as typeof setTimeout);
  try {
    api.mockRejectedValueOnce(new Error("offline"));
    await internals.connect();
    internals.handle = "resumption-handle";
    api.mockRejectedValueOnce(new ApiError("Daily allowance reached", 429));
    await internals.connect();
    const calls = api.mock.calls.slice(-2).map((call) => JSON.parse(String(call[1].body)));
    expect(calls[0].startId).toBe(calls[1].startId);
    expect(calls[0].resume).toBe(false);
    expect(calls[1].resume).toBe(true);
    expect(events.at(-1)).toEqual({ type: "error", message: "Daily allowance reached" });
    expect(failure.mock.calls).toHaveLength(1); // only the transient failure schedules a retry
  } finally {
    engine.stop();
    failure.mockRestore();
  }
});

test("one question per panel turn: a second ask or an early end waits for the student's answer", () => {
  const engine = new GeminiEngine(setup);
  const internals = engine as unknown as Internals & { endStudentTurn: () => void };
  const events: LiveEvent[] = [];
  internals.emit = (e) => events.push(e);
  const timers = spyOn(globalThis, "setTimeout").mockImplementation((() => 1) as unknown as typeof setTimeout);
  const ask = (topicId: string) =>
    internals.onToolCall({ id: topicId, name: "ask_question", args: { topicId, questionText: "Why?", questionType: "CONCEPTUAL", isFollowUp: false, panelist: "Chair" } })
      .response.allowed;
  try {
    expect(ask("scope")).toBe(true);
    expect(ask("method")).toBe(false); // the run-on: no answer yet
    expect((internals.onToolCall({ id: "e", name: "end_session" }).response as { ok?: boolean }).ok).toBe(false);
    expect(events.filter((e) => e.type === "ask")).toHaveLength(1);
    expect(events.some((e) => e.type === "end")).toBe(false);
    internals.endStudentTurn(); // the student answered
    expect(ask("method")).toBe(true);
  } finally {
    engine.stop();
    timers.mockRestore();
  }
});
