import { expect, test } from "bun:test";
import { DeleteNoticesInput, NoticeInput, sameNotice, Segment, segmentText, segmentWhere, visibleTo } from "./notice";

const input = { id: crypto.randomUUID(), title: "Update", body: "Practice resumes at 3 PM.", targetId: "student-a" };

test("bulk deletion requires a bounded explicit selection of notice IDs", () => {
  expect(DeleteNoticesInput.parse({ ids: [input.id, input.id] }).ids).toEqual([input.id]);
  for (const bad of [{}, { ids: [] }, { ids: ["all"] }, { ids: Array(101).fill(input.id) }, { ids: [input.id], all: true }]) {
    expect(DeleteNoticesInput.safeParse(bad).success).toBe(false);
  }
});

test("a student sees broadcasts, their own notices and filtered notices they were sent", () => {
  expect(visibleTo("student-a")).toEqual({
    OR: [{ targetId: null, segment: null }, { targetId: "student-a" }, { recipients: { some: { userId: "student-a" } } }],
  });
});

test("notice input rejects empty, oversized or unspecified audiences", () => {
  expect(NoticeInput.parse({ ...input, title: "  Update  " }).title).toBe("Update");
  for (const patch of [{ title: " " }, { body: " " }, { title: "a".repeat(121) }, { body: "a".repeat(2001) }, { targetId: "" }, { targetId: undefined }, { id: "not-an-id" }]) {
    expect(NoticeInput.safeParse({ ...input, ...patch }).success).toBe(false);
  }
});

test("a filtered notice needs at least one known filter and can't also name a student", () => {
  expect(NoticeInput.parse({ ...input, targetId: null, segment: { plan: "premium" } }).segment).toEqual({ plan: "premium" });
  expect(NoticeInput.parse({ ...input }).segment).toBeNull();
  expect(NoticeInput.safeParse({ ...input, segment: { plan: "premium" } }).success).toBe(false); // targetId + segment
  for (const bad of [{}, { plan: "gold" }, { course: "Astronomy" }, { practice: "sometimes" }, { plan: "free", extra: 1 }, { email: "unverified" }]) {
    expect(Segment.safeParse(bad).success).toBe(false);
  }
});

test("filters combine with AND and always skip students being deleted", () => {
  const now = new Date("2026-10-17T00:00:00Z");
  const week = new Date("2026-10-10T00:00:00Z");
  expect(segmentWhere({ plan: "premium", joined: "week", practice: "recent" }, now)).toEqual({
    AND: [{ deletedAt: null }, { premium: true }, { createdAt: { gte: week } }, { sessions: { some: { createdAt: { gte: week } } } }],
  });
  expect(segmentWhere({ joined: "month" }, now).AND).toEqual([{ deletedAt: null }, { createdAt: { gte: new Date("2026-09-17T00:00:00Z") } }]);
  expect(segmentWhere({ practice: "idle" }, now).AND).toEqual([
    { deletedAt: null },
    { sessions: { some: {} } },
    { sessions: { none: { createdAt: { gte: week } } } },
  ]);
  expect(segmentWhere({ course: "BSIT", practice: "never" }, now).AND).toEqual([{ deletedAt: null }, { course: "BSIT" }, { sessions: { none: {} } }]);
  const other = (segmentWhere({ course: "Other" }, now).AND as { course?: { notIn: string[] } }[])[1]!;
  expect(other.course!.notIn).not.toContain("Other");
  expect(other.course!.notIn).toContain("BSIT");
});

test("a retry must match the original admin, audience and content", () => {
  const saved = { ...input, createdBy: "admin-a", segment: null };
  const parsed = NoticeInput.parse(input);
  expect(sameNotice(saved, parsed, "admin-a")).toBe(true);
  expect(sameNotice(saved, parsed, "admin-b")).toBe(false);
  expect(sameNotice(saved, { ...parsed, targetId: null }, "admin-a")).toBe(false);
  expect(sameNotice(saved, { ...parsed, body: "Changed" }, "admin-a")).toBe(false);
  const filtered = { ...saved, targetId: null, segment: segmentText({ joined: "week", plan: "free" }) };
  expect(sameNotice(filtered, { ...parsed, targetId: null, segment: { plan: "free", joined: "week" } }, "admin-a")).toBe(true);
  expect(sameNotice(filtered, { ...parsed, targetId: null, segment: { plan: "free" } }, "admin-a")).toBe(false);
});
