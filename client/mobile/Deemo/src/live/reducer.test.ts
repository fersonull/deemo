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

test("the follow-up limit chosen in setup is the one enforced", () => {
  const none = run([{ type: "ask", question: main }], { ...initialLiveState, followUpLimit: 0 });
  expect(canAsk(none, follow)).toBe(false); // 0: every question opens a new topic
  let three = run([{ type: "ask", question: main }], { ...initialLiveState, followUpLimit: 3 });
  for (let i = 0; i < 3; i++) three = liveReducer(three, { type: "ask", question: follow });
  expect(three.question?.followUp).toBe(3);
  expect(canAsk(three, follow)).toBe(false);
});

test("the time limit closes once, clamps duration and preserves an answer arriving after time is up", () => {
  let s = run([
    { type: "connected" }, { type: "ask", question: main }, { type: "panelDone" },
    { type: "tick", ms: 500 }, { type: "youSpeaking" }, { type: "tick", ms: 2000 },
  ], { ...initialLiveState, durationLimitMs: 1000 });
  expect(s.phase).toBe("ending");
  expect(s.sessionMs).toBe(1000);
  expect(s.turns[0]).toMatchObject({ latencyMs: 500, answerMs: 500 });
  expect(canAsk(s, main)).toBe(false);
  s = run([
    { type: "youText", text: "It syncs in real time." }, { type: "panelText", text: "Thank you." },
    { type: "panelDone" }, { type: "end" }, { type: "tick", ms: 8000 }, { type: "ended" },
  ], s);
  expect(s.turns[0]?.answer).toBe("It syncs in real time.");
  expect(s.lines).toContainEqual({ who: "you", text: "It syncs in real time." });
  expect(s.lines.at(-1)).toEqual({ who: 0, text: "Thank you." });
  expect(s.sessionMs).toBe(1000);
  expect(s.endedBy).toBe("time");
  expect(s.turns).toHaveLength(1);
});

test("a paused, connecting or reconnecting session cannot reach its time limit", () => {
  for (const held of [{ paused: true }, { reconnecting: true }, { phase: "connecting" as const }]) {
    const s = { ...initialLiveState, phase: "presentation" as const, durationLimitMs: 1000, ...held };
    expect(liveReducer(s, { type: "tick", ms: 60_000 })).toBe(s);
  }
});

test("expiry during presentation or panel speech never invents an answer", () => {
  for (const phase of ["presentation", "speaking", "thinking"] as const) {
    const s = liveReducer({ ...initialLiveState, phase, durationLimitMs: 1000 }, { type: "tick", ms: 1000 });
    expect(s.phase).toBe("ending");
    expect(s.turns).toHaveLength(0);
  }
});

test("a terminal token error stops timers and keeps the transcript", () => {
  const s = run([{ type: "connected" }, { type: "youText", text: "My study" }, { type: "error", message: "Daily cap reached" }]);
  expect(s.error).toBe("Daily cap reached");
  expect(s.partial?.text).toBe("My study");
  expect(liveReducer(s, { type: "tick", ms: 5000 })).toBe(s);
});

test("speech before ask_question goes to the asker the tool names, and its guessed follow-up is undone", () => {
  const q1 = { topicId: "problem", text: "What problem does it solve?", type: "CONCEPTUAL" as const, isFollowUp: false, panelist: 0 };
  let s = liveReducer({ ...initialLiveState, phase: "presentation" }, { type: "ask", question: q1 });
  s = liveReducer(s, { type: "panelDone" });
  s = liveReducer(s, { type: "youText", text: "I don't know." });
  s = liveReducer(s, { type: "youDone" }); // thinking
  s = liveReducer(s, { type: "panelText", text: "That's okay. Could you specify your sample size?" }); // spoke first
  expect(s.partial?.who).toBe(0); // guessed: the last asker
  expect(s.followUps.problem).toBe(1); // guessed follow-up
  const q2 = { topicId: "sampling", text: "Could you specify your sample size?", type: "METHODOLOGICAL" as const, isFollowUp: false, panelist: 2 };
  s = liveReducer(s, { type: "ask", question: q2 });
  expect(s.partial).toEqual({ who: 2, text: "That's okay. Could you specify your sample size?" }); // one line, right name
  expect(s.question?.number).toBe(2);
  expect(s.question?.panelist).toBe(2);
  expect(s.followUps.problem ?? 0).toBe(0); // the guess is undone
  expect(s.unasked).toBeUndefined();
});

test("handover: the next panelist holds the floor, their intro and question are theirs, the transcript stays continuous", () => {
  const q1 = { topicId: "problem", text: "What problem?", type: "CONCEPTUAL" as const, isFollowUp: false, panelist: 0 };
  let s = liveReducer({ ...initialLiveState, phase: "presentation" }, { type: "ask", question: q1 });
  s = liveReducer(s, { type: "panelText", text: "What problem?" });
  s = liveReducer(s, { type: "panelDone" });
  s = liveReducer(s, { type: "youText", text: "Lost papers." });
  s = liveReducer(s, { type: "youDone" });
  s = liveReducer(s, { type: "handover", seat: 1 });
  expect(s.seat).toBe(1);
  expect(s.takeover).toBe(true);
  expect(s.phase).toBe("thinking");
  s = liveReducer(s, { type: "panelText", text: "Good afternoon, I'm Engr. Santos." }); // intro before the ask
  expect(s.partial?.who).toBe(1);
  expect(s.followUps.problem ?? 0).toBe(0); // not a follow-up on the Chair's topic
  const q2 = { topicId: "db", text: "Why PostgreSQL?", type: "TECHNICAL" as const, isFollowUp: false, panelist: 1 };
  s = liveReducer(s, { type: "ask", question: q2 });
  expect(s.takeover).toBe(false);
  expect(s.question?.number).toBe(2);
  expect(s.lines.map((l) => l.who)).toEqual([0, "you", 1]); // continuous: Chair, student, Santos's intro
});

test("speech without ask_question never pushes a follow-up past the limit (a handover line, a closing remark)", () => {
  let s = run([{ type: "connected" }, { type: "ask", question: main }], { ...initialLiveState, followUpLimit: 1 });
  s = liveReducer(s, { type: "ask", question: follow });
  s = { ...liveReducer(s, { type: "panelDone" }), phase: "thinking" }; // the student answered; the panel's turn
  s = liveReducer(s, { type: "panelText", text: "Thank you; I'll hand it over to Engr. Santos." });
  expect(s.question?.followUp).toBe(1); // not "2 of 1"
  expect(s.followUps.t1).toBe(1);
});

test("a new sentence in its own chunk gets a space", () => {
  let s = run([{ type: "connected" }, { type: "ask", question: main }]);
  s = run([{ type: "panelText", text: "are you planning to measure?" }, { type: "panelText", text: "Okay. Moving on." }], s);
  expect(s.partial?.text).toBe("are you planning to measure? Okay. Moving on.");
  s = liveReducer(s, { type: "panelText", text: " Next," });
  expect(s.partial?.text).toBe("are you planning to measure? Okay. Moving on. Next,");
});

test("a contradiction challenge replaces the card even at the follow-up limit, and doesn't use a follow-up", () => {
  let s = run([{ type: "connected" }, { type: "ask", question: main }]);
  for (let i = 0; i < FOLLOW_UP_LIMIT; i++) s = liveReducer(s, { type: "ask", question: follow });
  const challenge: AskQuestion = { ...follow, text: "Earlier you said 40, but your paper says 30. Which is correct?", challenge: true };
  expect(canAsk(s, follow)).toBe(false);
  expect(canAsk(s, challenge)).toBe(true);
  // Spoken first (no tool call yet), then the tool call arrives: the card shows the challenge.
  s = run([{ type: "youDone" }, { type: "panelText", text: "Earlier you said 40…" }, { type: "ask", question: challenge }], s);
  expect(s.question?.text).toBe(challenge.text);
  expect(s.question?.number).toBe(1);
  expect(s.question?.challenge).toBe(true);
  expect(s.followUps.t1).toBe(FOLLOW_UP_LIMIT); // unchanged
});
