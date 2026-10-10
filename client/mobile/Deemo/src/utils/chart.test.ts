/// <reference types="bun" />
import { expect, test } from "bun:test";

import { chartPoints, scoreY, segments } from "./chart";

test("points spread across the width; higher scores sit higher", () => {
  const p = chartPoints([0, 50, 100], 216, 116);
  expect(p.map((q) => q.x)).toEqual([8, 108, 208]);
  expect(p.map((q) => q.y)).toEqual([108, 58, 8]);
  expect(scoreY(50, 116)).toBe(58);
});

test("a single score sits in the middle; out-of-range scores are clamped", () => {
  expect(chartPoints([70], 200, 100)).toEqual([{ x: 100, y: 8 + 0.3 * 84 }]);
  expect(chartPoints([-5, 140], 100, 100).map((q) => q.y)).toEqual([92, 8]);
});

test("segments join neighbors at their midpoint with the right length and angle", () => {
  const [s] = segments([
    { x: 0, y: 0 },
    { x: 30, y: 40 },
  ]);
  expect(s).toEqual({ cx: 15, cy: 20, length: 50, angle: (Math.atan2(40, 30) * 180) / Math.PI });
  expect(segments([{ x: 1, y: 1 }])).toEqual([]);
});
