/// <reference types="bun" />
import { expect, test } from "bun:test";

import { nextTip, TIPS } from "./tips";

test("tips follow Deemo's voice: at most two sentences, no exclamation marks", () => {
  for (const t of TIPS) {
    expect(t).not.toContain("!");
    expect(t.split(/[.?]\s/).length).toBeLessThanOrEqual(2);
  }
});

test("the first tip can be any of them", () => {
  expect(nextTip(null, () => 0)).toBe(0);
  expect(nextTip(null, () => 0.9999)).toBe(TIPS.length - 1);
});

test("the next tip is never the one just shown, and stays in range", () => {
  for (let current = 0; current < TIPS.length; current++) {
    for (const r of [0, 0.25, 0.5, 0.75, 0.9999]) {
      const n = nextTip(current, () => r);
      expect(n).not.toBe(current);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(TIPS.length);
    }
  }
});
