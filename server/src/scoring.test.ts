/// <reference types="bun" />
import { expect, test } from "bun:test";

import { DEFAULT_WEIGHTS, band, consistencyPenalty, delivery, readiness } from "./scoring";

test("matches the addendum's worked example (Pre-Oral, 62)", () => {
  const r = readiness([4, 3, 4, 3, 3], DEFAULT_WEIGHTS, ["HIGH", "MEDIUM"], 8, 8);
  expect(r).toEqual({ score: 62, rubricScore: 69, penalty: 7, coverage: 1 });
  expect(band(r.score).band).toBe("Developing");
});

test("coverage has a 0.6 floor and the penalty caps at 15", () => {
  expect(readiness([5, 5, 5, 5, 5], DEFAULT_WEIGHTS, [], 1, 8).score).toBe(60);
  expect(consistencyPenalty(["HIGH", "HIGH", "HIGH", "HIGH"])).toBe(15);
  expect(readiness([1, 1, 1, 1, 1], DEFAULT_WEIGHTS, ["HIGH", "HIGH", "HIGH"], 4, 4).score).toBe(5);
});

test("weights are normalized, so custom totals still score 0–100", () => {
  expect(readiness([5, 1, 1, 1, 1], [100, 0, 0, 0, 0], [], 4, 4).score).toBe(100);
});

test("delivery uses spoken answers only and maps proxies to a level", () => {
  const answer = "We chose Supabase because um it gives us row level security and real time updates for the dashboard";
  const d = delivery([
    { answer, latencyMs: 2000, answerMs: 8000 }, // 18 words in 8 s = 135 wpm, 1 filler
    { answer: "typed answer", latencyMs: null, answerMs: 0 },
  ]);
  expect(d.latencyS).toBe(2);
  expect(d.wordsPerMin).toBe(135);
  expect(d.fillersPerMin).toBe(7.5);
  expect(d.level).toBe(4); // latency 5, fillers 3, rate 5
  expect(delivery([{ answer: "typed", latencyMs: null, answerMs: 0 }]).level).toBe(3);
});
