/// <reference types="bun" />
import { expect, test } from "bun:test";

import { FOLLOW_UP_LIMIT, canAsk, initialLiveState, liveReducer } from "./reducer";
import type { AskQuestion, LiveEvent, LiveState } from "./types";

const run = (events: LiveEvent[], s: LiveState = initialLiveState) => events.reduce(liveReducer, s);
const main: AskQuestion = { topicId: "t1", text: "Why Firebase?", type: "TECHNICAL", isFollowUp: false, panelist: 1 };
const follow: AskQuestion = { ...main, text: "Which number is right?", type: "CLARIFICATORY", isFollowUp: true };

test("follow-ups stop at the limit, enforced in code", () => {
  let s = run([{ type: "connected" }, { type: "ask", question: main }]);
  for (let i = 0; i < FOLLOW_UP_LIMIT; i++) {
    expect(canAsk(s, follow)).toBe(true);
    s = liveReducer(s, { type: "ask", question: follow });
  }
  expect(s.question?.followUp).toBe(FOLLOW_UP_LIMIT);
  expect(canAsk(s, follow)).toBe(false);
  expect(liveReducer(s, { type: "ask", question: follow })).toBe(s); // ignored
  expect(canAsk(s, { ...main, topicId: "t2" })).toBe(true); // new topic is fine
});

test("question numbers count main questions only", () => {
  const s = run([{ type: "ask", question: main }, { type: "ask", question: follow }, { type: "ask", question: { ...main, topicId: "t2" } }]);
  expect(s.question?.number).toBe(2);
});

test("timers freeze while paused or reconnecting; response time runs only while listening", () => {
  let s = run([{ type: "connected" }, { type: "ask", question: main }, { type: "panelText", text: "Why?" }, { type: "panelDone" }]);
  s = run([{ type: "tick", ms: 1000 }, { type: "pause" }, { type: "tick", ms: 5000 }, { type: "resume" }], s);
  s = run([{ type: "reconnecting", value: true }, { type: "tick", ms: 5000 }, { type: "reconnecting", value: false }, { type: "tick", ms: 500 }], s);
  expect(s.sessionMs).toBe(1500);
  expect(s.responseMs).toBe(1500);
});

test("a turn records latency and answer length", () => {
  const s = run([
    { type: "connected" },
    { type: "ask", question: main },
    { type: "panelDone" },
    { type: "tick", ms: 2000 }, // hesitation before speaking
    { type: "youText", text: "Because it syncs" },
    { type: "tick", ms: 3000 },
    { type: "youText", text: " in real time." },
    { type: "youDone" },
  ]);
  expect(s.turns).toHaveLength(1);
  expect(s.turns[0]).toMatchObject({ latencyMs: 2000, answerMs: 3000, answer: "Because it syncs in real time." });
  expect(s.lines.at(-1)).toEqual({ who: "you", text: "Because it syncs in real time." });
  expect(s.phase).toBe("thinking");
});

test("a flag marks the student's line it refers to", () => {
  const flag = { spokenClaim: "fifty users", manuscriptEvidence: "thirty respondents", severity: "HIGH" as const };
  const streaming = run([{ type: "ask", question: main }, { type: "panelDone" }, { type: "youText", text: "About fifty users" }, { type: "flag", flag }]);
  expect(streaming.partial?.flagged).toBe(true);
  const done = liveReducer(streaming, { type: "youDone" });
  expect(done.lines.at(-1)?.flagged).toBe(true);
  expect(done.flags).toHaveLength(1);
});

test("Gemini flow: mic marks latency, the transcript lands after the tap", () => {
  const s = run([
    { type: "connected" },
    { type: "ask", question: main },
    { type: "panelDone" },
    { type: "tick", ms: 1500 },
    { type: "youSpeaking" },
    { type: "tick", ms: 4000 },
    { type: "youDone" },
    { type: "youText", text: "Because it syncs in real time." },
  ]);
  expect(s.turns[0]).toMatchObject({ latencyMs: 1500, answerMs: 4000, answer: "Because it syncs in real time." });
  expect(s.partial).toEqual({ who: "you", text: "Because it syncs in real time." });
  const next = liveReducer(s, { type: "ask", question: { ...main, topicId: "t2" } });
  expect(next.lines.at(-1)).toEqual({ who: "you", text: "Because it syncs in real time." }); // kept, not dropped
});

test("panel speech without ask_question still counts toward the follow-up limit", () => {
  let s = run([{ type: "connected" }, { type: "ask", question: main }, { type: "panelDone" }]);
  for (let i = 0; i < FOLLOW_UP_LIMIT; i++) {
    s = run([{ type: "youDone" }, { type: "panelText", text: "Let me rephrase." }, { type: "panelDone" }], s);
  }
  expect(s.question).toMatchObject({ topicId: "t1", isFollowUp: true, followUp: FOLLOW_UP_LIMIT, number: 1 });
  expect(canAsk(s, follow)).toBe(false);
});
