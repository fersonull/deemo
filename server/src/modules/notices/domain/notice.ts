import { z } from "zod";

import type { Prisma } from "../../../../generated/prisma/client";
import { COURSES } from "../../identity/domain/course";

export const DeleteNoticesInput = z.object({ ids: z.array(z.uuid()).min(1).max(100).transform((ids) => [...new Set(ids)]) }).strict();

// Who a filtered notice goes to: every filter set must match (AND). Resolved into notice_recipients when it's sent,
// so the audience is the students who matched then, not whoever matches later. No email-verification filter:
// unverified students can't reach any signed-in route (identity/http/gates.ts), so they could never read it.
export const Segment = z
  .object({
    plan: z.enum(["premium", "free"]).optional(),
    joined: z.enum(["week", "month"]).optional(), // signed up in the last 7 or 30 days
    course: z.enum(COURSES).optional(),
    practice: z.enum(["never", "recent", "idle"]).optional(), // never practiced · practiced in 7 days · not in 7 days
  })
  .strict()
  .refine((s) => Object.values(s).some((v) => v !== undefined), "Pick at least one filter.");
export type Segment = z.infer<typeof Segment>;

const WEEK_MS = 7 * 86_400_000;

export function segmentWhere(s: Segment, now = new Date()): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput[] = [{ deletedAt: null }];
  if (s.plan) where.push({ premium: s.plan === "premium" });
  if (s.joined) where.push({ createdAt: { gte: new Date(now.getTime() - (s.joined === "week" ? 7 : 30) * 86_400_000) } });
  if (s.course === "Other") {
    // "Other" also covers a course that's no longer on the list (courseOf in identity/domain/course.ts). SQL's
    // NOT IN skips students who haven't answered the survey yet.
    where.push({ course: { notIn: COURSES.filter((c) => c !== "Other") } });
  } else if (s.course) where.push({ course: s.course });
  const week = new Date(now.getTime() - WEEK_MS);
  if (s.practice === "never") where.push({ sessions: { none: {} } });
  if (s.practice === "recent") where.push({ sessions: { some: { createdAt: { gte: week } } } });
  if (s.practice === "idle") where.push({ sessions: { some: {} } }, { sessions: { none: { createdAt: { gte: week } } } });
  return { AND: where };
}

export const NoticeInput = z
  .object({
    id: z.uuid(), // the composer keeps this ID on retry, so a slow response cannot send twice
    title: z.string().trim().min(1).max(120),
    body: z.string().trim().min(1).max(2000),
    targetId: z.string().trim().min(1).max(128).nullable(),
    segment: Segment.nullable().default(null),
  })
  .refine((n) => !(n.targetId && n.segment), "Send to one student or a filtered group, not both.");
export type NoticeInput = z.infer<typeof NoticeInput>;

export const AudienceInput = z.object({ segment: Segment });

export const NoticeId = z.object({ id: z.uuid() });
export const InboxQuery = z.object({ before: z.uuid().optional() });

// Everyone's broadcasts, notices to this student, and filtered notices they matched when sent.
export const visibleTo = (uid: string): Prisma.NoticeWhereInput => ({
  OR: [{ targetId: null, segment: null }, { targetId: uid }, { recipients: { some: { userId: uid } } }],
});

// Stored as JSON text with a fixed key order, so a retry compares equal.
export const segmentText = (s: Segment | null) =>
  s ? JSON.stringify({ plan: s.plan, joined: s.joined, course: s.course, practice: s.practice }) : null;

export function sameNotice(a: { createdBy: string; title: string; body: string; targetId: string | null; segment: string | null }, b: NoticeInput, adminId: string) {
  return a.createdBy === adminId && a.title === b.title && a.body === b.body && a.targetId === b.targetId && a.segment === segmentText(b.segment);
}
