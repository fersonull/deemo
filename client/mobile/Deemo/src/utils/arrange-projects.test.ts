import { expect, test } from "bun:test";

import { arrangeProjects } from "./arrange-projects";

const p = (id: string, day: number, extra: object = {}) => ({
  id,
  name: `${id}.pdf`,
  createdAt: `2026-10-${String(day).padStart(2, "0")}T00:00:00Z`,
  status: "ready" as const,
  confirmedAt: "2026-10-20T00:00:00Z",
  ...extra,
});
const list = [
  p("a", 10, { analysis: { title: "Zebra tracker" } }),
  p("b", 12, { group: { isOwner: false } }),
  p("c", 5, { status: "analyzing" as const, confirmedAt: undefined }),
  p("d", 8, { group: { isOwner: true }, analysis: { title: "Attendance app" } }),
];
const ids = (xs: { id: string }[]) => xs.map((x) => x.id);

test("sorts by date either way, or by title", () => {
  expect(ids(arrangeProjects(list, "newest", "all"))).toEqual(["b", "a", "d", "c"]);
  expect(ids(arrangeProjects(list, "oldest", "all"))).toEqual(["c", "d", "a", "b"]);
  expect(ids(arrangeProjects(list, "name", "all"))).toEqual(["d", "b", "c", "a"]);
});

test("filters mine, joined and needs review, without changing the input", () => {
  expect(ids(arrangeProjects(list, "newest", "mine"))).toEqual(["a", "d", "c"]);
  expect(ids(arrangeProjects(list, "newest", "joined"))).toEqual(["b"]);
  expect(ids(arrangeProjects(list, "newest", "review"))).toEqual(["c"]);
  expect(ids(list)).toEqual(["a", "b", "c", "d"]);
});
