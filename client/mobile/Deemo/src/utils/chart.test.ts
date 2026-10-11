/// <reference types="bun" />
import { expect, test } from "bun:test";

import { columnPath, columns, contentWidth, MIN_SLOT, scoreY, type Box } from "./chart";

const box: Box = { height: 120, top: 10, bottom: 10 };

test("scores map onto the plot from a 0 baseline; out-of-range scores are clamped", () => {
  expect(scoreY(100, box)).toBe(10);
  expect(scoreY(50, box)).toBe(60);
  expect(scoreY(0, box)).toBe(110);
  expect(scoreY(140, box)).toBe(10);
  expect(scoreY(-5, box)).toBe(110);
});

test("columns sit centered in equal slots, never wider than 24 px, and reach down to the baseline", () => {
  const [a, b] = columns([50, 100], 200, box);
  expect(a).toEqual({ x: 38, width: 24, y: 60, height: 50 });
  expect(b).toEqual({ x: 138, width: 24, y: 10, height: 100 });
  const narrow = columns([70, 70, 70, 70], 80, box);
  expect(narrow[0].width).toBe(12);
  expect(narrow[3].x).toBe(64);
});

test("the plot scrolls sideways only when the sessions need more room", () => {
  expect(contentWidth(5, 300)).toBe(300);
  expect(contentWidth(30, 300)).toBe(30 * MIN_SLOT);
});

test("a column path rounds its top, keeps a square base, and grows from the baseline", () => {
  const c = { x: 0, width: 20, y: 60, height: 50 };
  expect(columnPath(c)).toBe("M0 110 V64 Q0 60 4 60 H16 Q20 60 20 64 V110 Z");
  expect(columnPath(c, 0.5)).toBe("M0 110 V89 Q0 85 4 85 H16 Q20 85 20 89 V110 Z");
  expect(columnPath(c, 0)).toBe("M0 110 V110 Q0 110 0 110 H20 Q20 110 20 110 V110 Z");
});
