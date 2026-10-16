import { expect, test } from "bun:test";

import { handoverNote } from "./handover";
import { initialLiveState } from "./reducer";
import type { LiveState } from "./types";

const q = (topicId: string, text: string, panelist: number) => ({ topicId, text, type: "CONCEPTUAL" as const, isFollowUp: false, panelist, followUp: 0, number: 1 });

test("the next panelist hears the presentation, every question and answer, flags and covered topics", () => {
  const s: LiveState = {
    ...initialLiveState,
    lines: [
      { who: "you", text: "ReqTrack tracks enrollment requirements." },
      { who: 0, text: "What problem does it solve?" },
    ],
    turns: [
      { question: q("problem", "What problem does it solve?", 0), latencyMs: 900, answerMs: 8000, answer: "Lost paper requirements." },
      { question: q("scope", "Who are the users?", 0), latencyMs: null, answerMs: 0, answer: "" },
    ],
    flags: [{ spokenClaim: "40 respondents", manuscriptEvidence: "30 respondents", severity: "HIGH", atMs: 1 }],
  };
  const note = handoverNote(s, 0, 1);
  expect(note).toContain("Reyes (Chair) has finished");
  expect(note).toContain("You are Santos (Tech)");
  expect(note).toContain("Student's presentation: ReqTrack tracks enrollment requirements.");
  expect(note).toContain("Q1 by Reyes (Chair): What problem does it solve?\nStudent: Lost paper requirements.");
  expect(note).toContain("Student: (no answer)");
  expect(note).toContain('Said "40 respondents" but the manuscript says "30 respondents" (HIGH)');
  expect(note).toContain("Topics already covered (don't repeat them): problem, scope.");
  expect(note.endsWith("ask your first question.")).toBe(true);
});

test("a long session is trimmed, and the instruction stays at the end", () => {
  const long = "x".repeat(600);
  const turns = Array.from({ length: 40 }, (_, i) => ({ question: q(`t${i}`, long, 0), latencyMs: null, answerMs: 0, answer: long }));
  const note = handoverNote({ ...initialLiveState, turns }, 0, 1);
  expect(note.length).toBeLessThanOrEqual(6000);
  expect(note.endsWith("ask your first question.")).toBe(true);
});
