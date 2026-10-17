import { z } from "zod";

export const NoticeInput = z.object({
  id: z.uuid(), // the composer keeps this ID on retry, so a slow response cannot send twice
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(2000),
  targetId: z.string().trim().min(1).max(128).nullable(),
});
export type NoticeInput = z.infer<typeof NoticeInput>;

export const NoticeId = z.object({ id: z.uuid() });
export const InboxQuery = z.object({ before: z.uuid().optional() });

export const visibleTo = (uid: string) => ({ OR: [{ targetId: null }, { targetId: uid }] });
export const canRead = (uid: string, targetId: string | null) => targetId === null || uid === targetId;

export function sameNotice(a: NoticeInput & { createdBy: string }, b: NoticeInput, adminId: string) {
  return a.createdBy === adminId && a.title === b.title && a.body === b.body && a.targetId === b.targetId;
}
