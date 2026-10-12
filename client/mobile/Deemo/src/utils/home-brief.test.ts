/// <reference types="bun" />
import { expect, test } from "bun:test";

import { colors } from "@/colors";

import { briefText, homeBrief } from "./home-brief";

const s = (id: string, score?: number, tip?: string) => ({ id, mode: "TITLE" as const, score, tip });

test("the last score, its band and the change, with the next fix", () => {
  const b = homeBrief([s("b", 62, "Memorize the core problem background"), s("a", 55)], "ReqTrack", false);
  expect(briefText(b)).toBe(
    "Your last Title Defense scored 62%, Developing, up 7 points from the one before. Next, work on Memorize the core problem background",
  );
  expect(b.holding).toEqual({ value: 62, color: colors.amberInk });
  expect(b.mood).toBe("encouraging");
  expect(b.openId).toBe("b");
  expect(b.parts.find((p) => p.text === "up 7 points")?.color).toBe(colors.sageInk);
});

test("a drop is said plainly, and long fixes are clipped", () => {
  const b = homeBrief([s("b", 88, "x".repeat(200)), s("a", 90)], null, false);
  expect(briefText(b)).toContain("down 2 points from the one before");
  expect(briefText(b).endsWith("…")).toBe(true);
  expect(b.mood).toBe("cheering");
});

test("without a fix, Deemo points to the report", () => {
  expect(briefText(homeBrief([s("a", 74)], null, false))).toBe("Your last Title Defense scored 74%, Nearly ready. Open the report to see what to fix next.");
});

test("before any score", () => {
  expect(briefText(homeBrief([], null, false))).toContain("adding your manuscript");
  expect(briefText(homeBrief([], "ReqTrack", false))).toBe("Your panel has read ReqTrack. Up for your first round?");
  expect(briefText(homeBrief([s("a")], "ReqTrack", false))).toContain("at least one question");
  expect(homeBrief([], null, false).holding).toBeUndefined();
});

test("offline", () => {
  const b = homeBrief([s("a", 70)], null, true);
  expect(b.mood).toBe("sleepy");
  expect(briefText(b)).toContain("can't reach the DEEMO server");
});

test("Deemo's face follows the band", () => {
  const mood = (score: number) => homeBrief([s("a", score)], null, false).mood;
  expect(mood(92)).toBe("cheering");
  expect(mood(75)).toBe("idle");
  expect(mood(55)).toBe("encouraging");
  expect(mood(5)).toBe("nervous");
});

test("no exclamation marks", () => {
  for (const b of [homeBrief([], null, false), homeBrief([s("a", 99, "Speak slower")], null, false)])
    expect(briefText(b)).not.toContain("!");
});
