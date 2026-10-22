import { expect, test } from "bun:test";
import type { Request, Response } from "express";

import { MAINTENANCE_MESSAGE, requireOpen, type MaintenanceState } from "./maintenance";

const run = async (state: Omit<MaintenanceState, "updatedAt">) => {
  let passed = false;
  await requireOpen(async () => ({ ...state, updatedAt: null }))({} as Request, {} as Response, () => (passed = true));
  return passed;
};

test("student routes stay open unless maintenance is on", async () => {
  expect(await run({ on: false, message: "ignored" })).toBe(true);
  expect(run({ on: true, message: "Back at 9 PM." })).rejects.toMatchObject({ status: 503, code: "MAINTENANCE", message: "Back at 9 PM." });
  expect(run({ on: true, message: null })).rejects.toMatchObject({ message: MAINTENANCE_MESSAGE });
});
