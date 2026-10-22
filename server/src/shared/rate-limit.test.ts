/// <reference types="bun" />
import { expect, test } from "bun:test";

process.env.DATABASE_URL ??= "postgres://unused"; // the module builds the Prisma client; these helpers never query
process.env.FIREBASE_SERVICE_ACCOUNT ??= "unused";
const { LIMITS, memoryCounter, retryAfterSeconds, windowStart } = await import("./rate-limit");

test("requests in the same window share a counter; the next window starts fresh", () => {
  const minute = 60_000;
  const t = Date.parse("2026-10-15T08:30:12.500Z");
  expect(windowStart(t, minute)).toBe(Date.parse("2026-10-15T08:30:00Z"));
  expect(windowStart(t + 47_499, minute)).toBe(windowStart(t, minute));
  expect(windowStart(t + 47_500, minute)).toBe(Date.parse("2026-10-15T08:31:00Z"));
});

test("Retry-After counts down to the next window, never zero", () => {
  const minute = 60_000;
  expect(retryAfterSeconds(Date.parse("2026-10-15T08:30:12.500Z"), minute)).toBe(48);
  expect(retryAfterSeconds(Date.parse("2026-10-15T08:30:59.999Z"), minute)).toBe(1);
});

test("expensive routes are limited harder than reads", () => {
  expect(LIMITS.upload.limit).toBeLessThan(LIMITS.writes.limit);
  expect(LIMITS.groupJoin).toEqual({ limit: 10, windowMs: 60_000 }); // the old per-account code-guess rule
});

test("the in-memory counter counts per key and starts over each window", () => {
  const hit = memoryCounter(60_000);
  const t = Date.parse("2026-10-15T08:30:00Z");
  expect([hit("a", t), hit("a", t + 1000), hit("b", t + 2000)]).toEqual([1, 2, 1]);
  expect(hit("a", t + 60_000)).toBe(1);
});
