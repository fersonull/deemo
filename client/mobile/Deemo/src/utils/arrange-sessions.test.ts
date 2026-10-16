import { expect, test } from "bun:test";

import { arrangeSessions } from "./arrange-sessions";

const now = Date.parse("2026-10-17T12:00:00Z");
const s = (id: string, daysAgo: number, score?: number) => ({ id, createdAt: new Date(now - daysAgo * 86_400_000).toISOString(), score });
const list = [s("a", 1, 70), s("b", 10, 90), s("c", 3), s("d", 40, 55)];
const ids = (xs: { id: string }[]) => xs.map((x) => x.id);

test("sorts by date either way", () => {
  expect(ids(arrangeSessions(list, "newest", "all", now))).toEqual(["a", "c", "b", "d"]);
  expect(ids(arrangeSessions(list, "oldest", "all", now))).toEqual(["d", "b", "c", "a"]);
});

test("sorts by score with unscored sessions last", () => {
  expect(ids(arrangeSessions(list, "highest", "all", now))).toEqual(["b", "a", "d", "c"]);
  expect(ids(arrangeSessions(list, "lowest", "all", now))).toEqual(["d", "a", "b", "c"]);
});

test("keeps only the chosen date range, without changing the input", () => {
  expect(ids(arrangeSessions(list, "newest", "7d", now))).toEqual(["a", "c"]);
  expect(ids(arrangeSessions(list, "newest", "30d", now))).toEqual(["a", "c", "b"]);
  expect(ids(list)).toEqual(["a", "b", "c", "d"]);
});
