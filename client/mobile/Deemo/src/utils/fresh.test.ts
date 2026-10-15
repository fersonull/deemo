import { expect, test } from "bun:test";

import { freshFor } from "./fresh";

test("reuses a recent load, shares one in flight, and reloads when forced, stale or invalidated", async () => {
  let t = 0;
  let calls = 0;
  const f = freshFor(60_000, () => t);
  const load = async () => (calls++, true);

  await Promise.all([f.run(load), f.run(load)]); // the second joins the first
  expect(calls).toBe(1);

  t = 59_999;
  await f.run(load); // still fresh
  expect(calls).toBe(1);
  await f.run(load, true); // pull to refresh
  expect(calls).toBe(2);

  t += 60_000;
  await f.run(load); // stale
  expect(calls).toBe(3);

  f.invalidate();
  await f.run(load);
  expect(calls).toBe(4);
});

test("a failed load doesn't count as fresh", async () => {
  let calls = 0;
  const f = freshFor(60_000, () => 0);
  await f.run(async () => (calls++, false));
  await f.run(async () => (calls++, true));
  expect(calls).toBe(2);
});
