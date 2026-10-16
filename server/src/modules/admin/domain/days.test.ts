import { expect, test } from "bun:test";

import { fillDays } from "./days";

test("every Philippine day in the window, oldest first, zero-filled", () => {
  const now = Date.UTC(2026, 9, 15, 20); // 04:00 on Oct 16 in the Philippines
  expect(fillDays([{ day: "2026-10-15", n: 3 }], 3, now)).toEqual([
    { day: "2026-10-14", n: 0 },
    { day: "2026-10-15", n: 3 },
    { day: "2026-10-16", n: 0 },
  ]);
});
