/// <reference types="bun" />
import { expect, test } from "bun:test";

import { DEFAULT_WEIGHTS, band, consistencyPenalty, delivery, levelPoints, readiness } from "./scoring";

test("a Poor answer earns nothing, Satisfactory half, Excellent all", () => {
  expect([1, 2, 3, 4, 5].map(levelPoints)).toEqual([0, 0.25, 0.5, 0.75, 1]);
});

test("the addendum's worked example under the stricter points (Pre-Oral, 54)", () => {
  // Levels 4,3,4,3,3 used to earn 69 (level / 5); with (level − 1) / 4 they earn 61.25.
  const r = readiness([4, 3, 4, 3, 3], DEFAULT_WEIGHTS, ["HIGH", "MEDIUM"], 8, 8);
  expect(r).toEqual({ score: 54, rubricScore: 61, penalty: 7, coverage: 1 });
  expect(band(r.score).band).toBe("Developing");
});

test("coverage has no floor: leaving after one of eight questions keeps an eighth", () => {
  expect(readiness([5, 5, 5, 5, 5], DEFAULT_WEIGHTS, [], 1, 8).score).toBe(13); // was 60 with the 0.6 floor
  expect(readiness([5, 5, 5, 5, 5], DEFAULT_WEIGHTS, [], 0, 8).score).toBe(0);
});

test("all-Poor answers score zero, and the penalty caps at 15", () => {
  expect(readiness([1, 1, 1, 1, 1], DEFAULT_WEIGHTS, [], 4, 4).score).toBe(0);
  expect(consistencyPenalty(["HIGH", "HIGH", "HIGH", "HIGH"])).toBe(15);
});

test("an unmeasured criterion drops out instead of earning a free middle score", () => {
  expect(readiness([5, 5, 5, 5, null], DEFAULT_WEIGHTS, [], 4, 4).score).toBe(100);
  expect(readiness([3, 3, 3, 3, null], DEFAULT_WEIGHTS, [], 4, 4).score).toBe(50);
});

test("weights are normalized, so custom totals still score 0–100", () => {
  expect(readiness([5, 1, 1, 1, 1], [100, 0, 0, 0, 0], [], 4, 4).score).toBe(100);
});

test("delivery uses spoken answers only; with none it isn't measured", () => {
  const answer = "We chose Supabase because um it gives us row level security and real time updates for the dashboard";
  const d = delivery([
    { answer, latencyMs: 2000, answerMs: 8000 }, // 18 words in 8 s = 135 wpm, 1 filler
    { answer: "typed answer", latencyMs: null, answerMs: 0 },
  ]);
  expect(d.latencyS).toBe(2);
  expect(d.wordsPerMin).toBe(135);
  expect(d.fillersPerMin).toBe(7.5);
  expect(d.level).toBe(4); // latency 5, fillers 3, rate 5
  expect(delivery([{ answer: "typed", latencyMs: null, answerMs: 0 }]).level).toBeNull();
});
