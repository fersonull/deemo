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
mock.module("./voice-level", () => ({ panelVoice: { value: 0 } }));
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

test("one question per panel turn: a repeat before it's heard is fine; after it, the panel is cut off until the student's turn", () => {
  const engine = new GeminiEngine(setup);
  const internals = engine as unknown as Internals & { endStudentTurn: () => void; play: (b64: string) => void; quiet: boolean; queued: number };
  const events: LiveEvent[] = [];
  internals.emit = (e) => events.push(e);
  const timers = spyOn(globalThis, "setTimeout").mockImplementation((() => 1) as unknown as typeof setTimeout);
  const enqueued: unknown[] = [];
  (internals as unknown as { ctx: object; voice: object }).ctx = { createBuffer: () => ({ copyToChannel: () => {} }), close: async () => {} };
  (internals as unknown as { voice: object }).voice = { enqueueBuffer: (b: unknown) => enqueued.push(b), stop: () => {} };
  const ask = (topicId: string) =>
    internals.onToolCall({ id: topicId, name: "ask_question", args: { topicId, questionText: "Why?", questionType: "CONCEPTUAL", isFollowUp: false, panelist: "Chair" } })
      .response.allowed;
  const voice = "AAAA"; // two silent PCM16 samples
  try {
    expect(ask("scope")).toBe(true);
    expect(ask("scope")).toBe(true); // the same call again, nothing heard yet: approved, not counted twice
    expect(events.filter((e) => e.type === "ask")).toHaveLength(1);
    internals.play(voice); // the question is heard
    expect(ask("method")).toBe(false); // the run-on
    expect(internals.quiet).toBe(true);
    internals.play(voice); // whatever it says next is dropped
    expect(enqueued).toHaveLength(1);
    expect((internals.onToolCall({ id: "e", name: "end_session" }).response as { ok?: boolean }).ok).toBe(false);
    expect(events.some((e) => e.type === "end")).toBe(false);
    internals.endStudentTurn(); // the student answered
    expect(internals.quiet).toBe(false);
    expect(ask("method")).toBe(true);
  } finally {
    engine.stop();
    timers.mockRestore();
  }
});

test("in turns: each panelist asks their share, then the next takes over in their own session with a handover note", async () => {
  const engine = new GeminiEngine({ ...setup, panelists: 3, minutes: 15 }); // share: 2 main questions each
  const internals = engine as unknown as Internals & {
    endStudentTurn: () => void;
    settle: () => void;
    seat: number;
    passing: boolean;
    turnDone: boolean;
    queued: number;
    note: (from: number, to: number) => string;
  };
  const events: LiveEvent[] = [];
  const sent: any[] = [];
  internals.emit = (e) => events.push(e);
  internals.note = (from, to) => `note ${from}->${to}`;
  internals.ready = true;
  internals.ws = { send: (d) => sent.push(JSON.parse(d)), close: () => {} };
  const timers = spyOn(globalThis, "setTimeout").mockImplementation((() => 1) as unknown as typeof setTimeout);
  const ask = (topicId: string, isFollowUp = false) =>
    internals.onToolCall({ id: topicId, name: "ask_question", args: { topicId, questionText: "Why?", questionType: "CONCEPTUAL", isFollowUp, panelist: "Methodology" } })
      .response.allowed;
  try {
    expect(ask("a")).toBe(true);
    expect((events.at(-1) as { question: { panelist: number } }).question.panelist).toBe(0); // the asker is the seat
    internals.endStudentTurn();
    expect(ask("a", true)).toBe(true); // follow-ups don't use the share
    internals.endStudentTurn();
    expect(ask("b")).toBe(true); // second main question: share reached (the next token is fetched early)
    internals.endStudentTurn();
    expect(ask("c")).toBe(false); // a third main question: hand over instead
    expect(internals.passing).toBe(true);
    internals.turnDone = true;
    internals.queued = 0;
    internals.settle(); // the turn settles: the next panelist takes over
    expect(internals.seat).toBe(1);
    expect(events.at(-1)).toEqual({ type: "handover", seat: 1 });
    // pass_to_next is refused while a question waits, honoured after the answer
    internals.ready = true;
    internals.ws = { send: (d) => sent.push(JSON.parse(d)), close: () => {} };
    (internals as unknown as { onMessage: (m: object) => void }).onMessage({ setupComplete: {} });
    expect(sent.at(-1).clientContent.turns[0].parts[0].text).toBe("note 0->1");
    expect(ask("d")).toBe(true);
    expect((internals.onToolCall({ id: "p", name: "pass_to_next" }).response as { ok: boolean }).ok).toBe(false);
    internals.endStudentTurn();
    expect((internals.onToolCall({ id: "p", name: "pass_to_next" }).response as { ok: boolean }).ok).toBe(true);
    expect(internals.passing).toBe(true);
  } finally {
    engine.stop();
    timers.mockRestore();
  }
});

test("handover never strands the floor: a late pass_to_next, a spoken handover, or a stalled turn all move on", () => {
  const make = () => {
    const engine = new GeminiEngine({ ...setup, panelists: 2, minutes: 15 });
    const i = engine as unknown as Internals & {
      endStudentTurn: () => void;
      settle: () => void;
      armStall: () => void;
      giveFloor: () => void;
      seat: number;
      spoken: string;
      turnDone: boolean;
      queued: number;
    };
    const events: LiveEvent[] = [];
    i.emit = (e) => events.push(e);
    i.ready = true;
    i.ws = { send: () => {}, close: () => {} };
    return { engine, i, events };
  };
  const jobs: { run: () => void; ms: number }[] = [];
  const timers = spyOn(globalThis, "setTimeout").mockImplementation(((run: () => void, ms: number) => {
    jobs.push({ run, ms });
    return jobs.length;
  }) as typeof setTimeout);
  try {
    // 1. pass_to_next arrives after the floor went back to a student who hasn't spoken: hand over now.
    const a = make();
    a.i.giveFloor();
    expect(a.i.studentFloor).toBe(true);
    a.i.onToolCall({ id: "p", name: "pass_to_next" });
    expect(a.i.seat).toBe(1);
    expect(a.i.studentFloor).toBe(false);
    expect(a.events.at(-1)).toEqual({ type: "handover", seat: 1 });
    a.engine.stop();

    // 2. No tool call, but the turn named the next panelist and asked nothing: a handover.
    const b = make();
    b.i.spoken = "I'm satisfied, so I will now pass the questioning to Engr. Santos.";
    b.i.turnDone = true;
    b.i.queued = 0;
    b.i.settle();
    expect(b.i.seat).toBe(1);
    b.engine.stop();

    // 3. The panel went quiet without turnComplete: after the stall the floor goes back to the student.
    const c = make();
    c.i.armStall();
    (c.i as unknown as { heard: boolean }).heard = true;
    jobs.filter((j) => j.ms === 12000).at(-1)!.run();
    expect(c.i.studentFloor).toBe(true);
    c.engine.stop();
  } finally {
    timers.mockRestore();
  }
});

test("a turn that only flagged a contradiction goes ahead at once, without the quiet-turn wait", () => {
  const engine = new GeminiEngine(setup);
  const i = engine as unknown as Internals & { endStudentTurn: () => void; settle: () => void; turnDone: boolean; queued: number };
  const sent: any[] = [];
  i.emit = () => {};
  i.ready = true;
  i.ws = { send: (d) => sent.push(JSON.parse(d)), close: () => {} };
  const jobs: { ms: number }[] = [];
  const timers = spyOn(globalThis, "setTimeout").mockImplementation(((_run: () => void, ms: number) => {
    jobs.push({ ms });
    return jobs.length;
  }) as typeof setTimeout);
  try {
    i.endStudentTurn();
    i.onToolCall({ id: "f", name: "flag_inconsistency", args: { spokenClaim: "40", manuscriptEvidence: "30", severity: "HIGH" } });
    i.turnDone = true;
    i.queued = 0;
    i.settle(); // no voice, no question: just the flag
    expect(sent.at(-1).clientContent.turns[0].parts[0].text).toContain("ask your next question");
    expect(jobs.some((j) => j.ms === 2500)).toBe(false); // no waiting for late audio
  } finally {
    engine.stop();
    timers.mockRestore();
  }
});
