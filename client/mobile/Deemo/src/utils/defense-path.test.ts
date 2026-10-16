import { expect, test } from "bun:test";

import { defensePath } from "./defense-path";

test("nothing practiced: every stage not started, Title is current", () => {
  const p = defensePath([]);
  expect(p.map((s) => s.state)).toEqual(["not-started", "not-started", "not-started"]);
  expect(p.map((s) => s.current)).toEqual([true, false, false]);
});

test("best score decides ready; latest is the newest scored session; current is the first stage not ready", () => {
  const p = defensePath([
    { mode: "TITLE", createdAt: "2026-10-01T00:00:00Z", score: 88 },
    { mode: "TITLE", createdAt: "2026-10-03T00:00:00Z", score: 74 },
    { mode: "PRE_ORAL", createdAt: "2026-10-04T00:00:00Z", score: 62 },
    { mode: "PRE_ORAL", createdAt: "2026-10-05T00:00:00Z" }, // still scoring
  ]);
  expect(p[0]).toMatchObject({ mode: "TITLE", state: "ready", best: 88, latest: 74, sessions: 2, current: false });
  expect(p[1]).toMatchObject({ mode: "PRE_ORAL", state: "practicing", best: 62, latest: 62, sessions: 2, current: true });
  expect(p[2]).toMatchObject({ mode: "FINAL", state: "not-started", best: null, current: false });
});

test("every stage ready: none is current", () => {
  const all = (["TITLE", "PRE_ORAL", "FINAL"] as const).map((mode) => ({ mode, createdAt: "2026-10-01T00:00:00Z", score: 90 }));
  expect(defensePath(all).some((s) => s.current)).toBe(false);
});
