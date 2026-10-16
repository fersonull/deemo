import { expect, test } from "bun:test";

import { MeUpdate } from "./schemas";

test("PATCH /me takes a course from the list only", () => {
  expect(MeUpdate.safeParse({ course: "Maritime" }).success).toBe(true);
  expect(MeUpdate.safeParse({ course: "Astrology" }).success).toBe(false);
});
