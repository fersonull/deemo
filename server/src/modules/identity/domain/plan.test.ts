/// <reference types="bun" />
import { expect, test } from "bun:test";

import { planOf, setupProblem } from "./plan";

const setup = (over = {}) => ({ mode: "TITLE", panelists: 1, minutes: 10, ...over });

test("Free covers Title and Pre-Oral, one panelist, ten minutes", () => {
  expect(setupProblem(false, setup())).toBeNull();
  expect(setupProblem(false, setup({ mode: "PRE_ORAL" }))).toBeNull();
  expect(setupProblem(false, setup({ mode: "FINAL" }))?.status).toBe(403);
  expect(setupProblem(false, setup({ panelists: 2 }))?.status).toBe(403);
  expect(setupProblem(false, setup({ minutes: 15 }))?.status).toBe(403);
});

test("Premium opens everything up to 25 minutes", () => {
  expect(setupProblem(true, setup({ mode: "FINAL", panelists: 3, minutes: 25 }))).toBeNull();
  expect(setupProblem(true, setup({ minutes: 30 }))?.status).toBe(400);
});

test("daily sessions and manuscripts per plan", () => {
  expect(planOf(false).dailySessions).toBe(5);
  expect(planOf(true).dailySessions).toBe(Infinity);
  expect(planOf(false).manuscripts).toBe(1);
  expect(planOf(true).manuscripts).toBe(Infinity);
});
