/// <reference types="bun" />
import { expect, test } from "bun:test";

process.env.FIREBASE_SERVICE_ACCOUNT ??= "unused"; // sessions.ts imports the store; the helper under test needs neither

const { substantive } = await import("./sessions");

test("an answer counts with 3+ real words", () => {
  expect(substantive("Because it is easy and free.")).toBe(true);
  expect(substantive("I'm not sure.")).toBe(true); // weak, but an answer; the judge scores it 1
  expect(substantive("uh ... ok")).toBe(false);
  expect(substantive("")).toBe(false);
  expect(substantive("   ")).toBe(false);
});
