import { expect, test } from "bun:test";
import type { Request, Response } from "express";

import { requireAdmin } from "./gate";

const run = (auth: object | undefined) => {
  let passed = false;
  requireAdmin({ auth } as unknown as Request, {} as Response, () => (passed = true));
  return passed;
};

test("only the admin claim gets through", () => {
  expect(run({ uid: "a", admin: true })).toBe(true);
  expect(() => run({ uid: "b", admin: false })).toThrow("Admins only.");
  expect(() => run(undefined)).toThrow("Admins only.");
});
