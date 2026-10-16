import { expect, test } from "bun:test";

import { sessionWhere, userWhere } from "./filters";

test("no filter matches everyone", () => {
  expect(userWhere({})).toEqual({});
});

test("search, plan and verification combine", () => {
  expect(userWhere({ q: "kim", plan: "premium", verified: false })).toEqual({
    OR: [{ name: { contains: "kim", mode: "insensitive" } }, { email: { contains: "kim", mode: "insensitive" } }],
    premium: true,
    emailVerified: false,
  });
  expect(userWhere({ plan: "free" })).toEqual({ premium: false });
});

test("session filters: stage, status, a date range and a search over title and student", () => {
  const from = new Date("2026-10-01T00:00:00+08:00");
  const to = new Date("2026-10-16T00:00:00+08:00");
  expect(sessionWhere({})).toEqual({});
  expect(sessionWhere({ mode: "FINAL", status: "failed", from, to, q: "kim" })).toEqual({
    mode: "FINAL",
    status: "failed",
    createdAt: { gte: from, lt: to },
    OR: [
      { title: { contains: "kim", mode: "insensitive" } },
      { user: { email: { contains: "kim", mode: "insensitive" } } },
      { user: { name: { contains: "kim", mode: "insensitive" } } },
    ],
  });
  expect(sessionWhere({ to })).toEqual({ createdAt: { lt: to } });
});
