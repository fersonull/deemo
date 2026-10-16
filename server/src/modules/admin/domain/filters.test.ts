import { expect, test } from "bun:test";

import { userWhere } from "./filters";

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
