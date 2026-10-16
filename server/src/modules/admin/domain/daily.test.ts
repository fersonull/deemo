import { expect, test } from "bun:test";

import { dailyUsage } from "./daily";

// 2026-10-16 02:00 UTC is 10:00 on 2026-10-16 in the Philippines.
const now = Date.UTC(2026, 9, 16, 2);

test("today's count only counts on today's Philippine day, against the plan's cap", () => {
  expect(dailyUsage({ premium: false, sessionDay: "2026-10-16", sessionCount: 2 }, now)).toEqual({ usedToday: 2, dailyCap: 2 });
  expect(dailyUsage({ premium: true, sessionDay: "2026-10-15", sessionCount: 7 }, now)).toEqual({ usedToday: 0, dailyCap: 10 });
  expect(dailyUsage({ premium: false, sessionDay: null, sessionCount: 0 }, now)).toEqual({ usedToday: 0, dailyCap: 2 });
});
