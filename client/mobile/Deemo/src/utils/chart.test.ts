/// <reference types="bun" />
import { expect, test } from "bun:test";

import { areaPath, chartPoints, linePath, nearestIndex, pathLength, scaleY, scoreDomain, type Box } from "./chart";

const box: Box = { width: 220, height: 120, left: 10, right: 10, top: 10, bottom: 10 };

test("the domain reaches 100 and floors at a round number below the lowest score, at most 50", () => {
  expect(scoreDomain([72, 88])).toEqual([40, 100]);
  expect(scoreDomain([61, 64])).toEqual([40, 100]);
  expect(scoreDomain([33, 90])).toEqual([20, 100]);
  expect(scoreDomain([2, 10])).toEqual([0, 100]);
});

test("points spread across the plot; higher scores sit higher; out-of-range scores are clamped", () => {
  const p = chartPoints([0, 50, 100], [0, 100], box);
  expect(p.map((q) => q.x)).toEqual([10, 110, 210]);
  expect(p.map((q) => q.y)).toEqual([110, 60, 10]);
  expect(scaleY(140, [40, 100], box)).toBe(10);
  expect(scaleY(10, [40, 100], box)).toBe(110);
});

test("a single score sits in the middle", () => {
  expect(chartPoints([70], [40, 100], box)).toEqual([{ x: 110, y: 60 }]);
});

test("paths, length and the nearest point", () => {
  const p = [
    { x: 0, y: 0 },
    { x: 30, y: 40 },
    { x: 60, y: 40 },
  ];
  expect(linePath(p)).toBe("M0 0 L30 40 L60 40");
  expect(areaPath(p, box)).toBe("M0 0 L30 40 L60 40 L60 110 L0 110 Z");
  expect(pathLength(p)).toBe(80);
  expect(nearestIndex(p, 44)).toBe(1);
  expect(nearestIndex(p, 46)).toBe(2);
  expect(nearestIndex(p, -20)).toBe(0);
});
