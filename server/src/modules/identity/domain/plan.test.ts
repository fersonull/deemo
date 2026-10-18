/// <reference types="bun" />
import { expect, test } from "bun:test";

import { planOf, setupProblem } from "./plan";

const setup = (over = {}) => ({ mode: "TITLE", panelists: 1, ...over });

test("Free covers Title and Pre-Oral with one panelist", () => {
  expect(setupProblem(false, setup())).toBeNull();
  expect(setupProblem(false, setup({ mode: "PRE_ORAL" }))).toBeNull();
  expect(setupProblem(false, setup({ mode: "FINAL" }))?.status).toBe(403);
  expect(setupProblem(false, setup({ panelists: 2 }))?.status).toBe(403);
});

test("Premium opens everything; session length is only a safety cap (30 Free, 60 Premium)", () => {
  expect(setupProblem(true, setup({ mode: "FINAL", panelists: 3 }))).toBeNull();
  expect(planOf(false).capMinutes).toBe(30);
  expect(planOf(true).capMinutes).toBe(60);
});

test("daily sessions and manuscripts per plan", () => {
  expect(planOf(false).dailySessions).toBe(5);
  expect(planOf(true).dailySessions).toBe(Infinity);
  expect(planOf(false).manuscripts).toBe(1);
  expect(planOf(true).manuscripts).toBe(Infinity);
});
