import { expect, test } from "bun:test";

import { noticeWhen } from "./notice-when";

const now = new Date(2026, 9, 17, 15, 0);

test("says when a notice arrived", () => {
  expect(noticeWhen(new Date(2026, 9, 17, 14, 59, 30).toISOString(), now)).toBe("Just now");
  expect(noticeWhen(new Date(2026, 9, 17, 9, 5).toISOString(), now)).toBe("Today, 9:05 AM");
  expect(noticeWhen(new Date(2026, 9, 16, 23, 40).toISOString(), now)).toBe("Yesterday, 11:40 PM");
  expect(noticeWhen(new Date(2026, 9, 12, 8, 0).toISOString(), now)).toBe("Oct 12");
  expect(noticeWhen(new Date(2025, 11, 30, 8, 0).toISOString(), now)).toBe("Dec 30, 2025");
});
