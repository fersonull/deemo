/// <reference types="bun" />
import { expect, test } from "bun:test";

import { columnPath, columns, contentWidth, gapFor, MIN_SLOT, scoreY, type Box } from "./chart";

const box: Box = { height: 120, top: 10, bottom: 10 };

test("scores map onto the plot from a 0 baseline; out-of-range scores are clamped", () => {
  expect(scoreY(100, box)).toBe(10);
  expect(scoreY(50, box)).toBe(60);
  expect(scoreY(0, box)).toBe(110);
  expect(scoreY(140, box)).toBe(10);
  expect(scoreY(-5, box)).toBe(110);
});

test("columns fill their slots, keep a gap between neighbors, and reach down to the baseline", () => {
  const [a, b] = columns([50, 100], 200, box);
  expect(a).toEqual({ x: 8, width: 84, y: 60, height: 50 });
  expect(b).toEqual({ x: 108, width: 84, y: 10, height: 100 });
  const narrow = columns([70, 70, 70, 70], 80, box);
  expect(narrow[0].width).toBe(14);
  expect(narrow[3].x).toBe(63);
  expect(gapFor(400)).toBe(16);
  expect(gapFor(10)).toBe(6);
});

test("the plot scrolls sideways only when the sessions need more room", () => {
  expect(contentWidth(5, 300)).toBe(300);
  expect(contentWidth(30, 300)).toBe(30 * MIN_SLOT);
});

test("a column path rounds its top, keeps a square base, and grows from the baseline", () => {
  const c = { x: 0, width: 20, y: 60, height: 50 };
  expect(columnPath(c)).toBe("M0 110 V66 Q0 60 6 60 H14 Q20 60 20 66 V110 Z");
  expect(columnPath(c, 0.5)).toBe("M0 110 V91 Q0 85 6 85 H14 Q20 85 20 91 V110 Z");
  expect(columnPath(c, 0)).toBe("M0 110 V110 Q0 110 0 110 H20 Q20 110 20 110 V110 Z");
});
