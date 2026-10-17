import { expect, test } from "bun:test";
import { canRead, NoticeInput, sameNotice } from "./notice";

const input = { id: crypto.randomUUID(), title: "Update", body: "Practice resumes at 3 PM.", targetId: "student-a" };

test("a private notice is readable only by its recipient; a broadcast is readable by either student", () => {
  expect(canRead("student-a", input.targetId)).toBe(true);
  expect(canRead("student-b", input.targetId)).toBe(false);
  expect(canRead("student-a", null)).toBe(true);
  expect(canRead("student-b", null)).toBe(true);
});

test("notice input rejects empty, oversized or unspecified audiences", () => {
  expect(NoticeInput.parse({ ...input, title: "  Update  " }).title).toBe("Update");
  for (const patch of [{ title: " " }, { body: " " }, { title: "a".repeat(121) }, { body: "a".repeat(2001) }, { targetId: "" }, { targetId: undefined }, { id: "not-an-id" }]) {
    expect(NoticeInput.safeParse({ ...input, ...patch }).success).toBe(false);
  }
});

test("a retry must match the original admin, audience and content", () => {
  const saved = { ...input, createdBy: "admin-a" };
  expect(sameNotice(saved, input, "admin-a")).toBe(true);
  expect(sameNotice(saved, input, "admin-b")).toBe(false);
  expect(sameNotice(saved, { ...input, targetId: null }, "admin-a")).toBe(false);
  expect(sameNotice(saved, { ...input, body: "Changed" }, "admin-a")).toBe(false);
});
