import type { AuthClaims } from "../../../shared/auth/authenticate";
import { AppError } from "../../../shared/errors";
import { isDuplicate, prisma, withSerializable } from "../../../shared/prisma";
import { record } from "../../admin/application/actions";
import { sameNotice, segmentText, segmentWhere, visibleTo, type NoticeInput, type Segment } from "../domain/notice";
import { noticeHub } from "../infrastructure/notice-repo";
import { pushNotice } from "../infrastructure/push";

export async function sendNotice(admin: AuthClaims, input: NoticeInput) {
  let fresh = false; // created by this call, not a retry of one already sent
  const notice = await withSerializable(async (tx) => {
    fresh = false;
    const existing = await tx.notice.findUnique({ where: { id: input.id } });
    if (existing) {
      if (!sameNotice(existing, input, admin.uid)) throw new AppError(409, "This notice was already sent with different content. Start a new notice.");
      return existing;
    }
    if (input.targetId) {
      const user = await tx.user.findUnique({ where: { id: input.targetId }, select: { deletedAt: true } });
      if (!user || user.deletedAt) throw new AppError(404, "That student is unavailable.");
    }
    // A filtered notice goes to the students who match right now.
    const recipients = input.segment
      ? await tx.user.findMany({ where: segmentWhere(input.segment), select: { id: true } })
      : [];
    if (input.segment && !recipients.length) throw new AppError(422, "No students match these filters.");
    const created = await tx.notice.create({ data: { ...input, segment: segmentText(input.segment), createdBy: admin.uid } });
    if (recipients.length) await tx.noticeRecipient.createMany({ data: recipients.map((u) => ({ noticeId: input.id, userId: u.id })) });
    await record(admin, "notice_sent", { id: input.targetId ?? (input.segment ? `segment:${recipients.length}` : "all"), email: null }, tx);
    fresh = true;
    return created;
  }).catch(async (error: unknown) => {
    if (!isDuplicate(error)) throw error;
    const existing = await prisma.notice.findUnique({ where: { id: input.id } });
    if (!existing || !sameNotice(existing, input, admin.uid)) throw new AppError(409, "This notice ID is already in use. Start a new notice.");
    return existing;
  });
  noticeHub.notify(notice.targetId);
  if (fresh) void pushNotice(notice).catch((e: unknown) => console.error("notice push failed:", e));
  return { id: notice.id };
}

export async function readNotice(uid: string, id: string) {
  const n = await prisma.notice.findFirst({ where: { id, ...visibleTo(uid) }, select: { id: true } });
  if (!n) throw new AppError(404, "Notice not found.");
  await prisma.noticeRead.upsert({ where: { userId_noticeId: { userId: uid, noticeId: id } }, create: { userId: uid, noticeId: id }, update: {} });
  noticeHub.notify(uid);
}

export async function sentNotices(page: number) {
  const [total, notices] = await Promise.all([
    prisma.notice.count(),
    prisma.notice.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * 25, take: 25,
      include: { target: { select: { id: true, name: true, email: true } }, _count: { select: { reads: true, recipients: true } } },
    }),
  ]);
  return {
    total,
    page,
    pageSize: 25,
    notices: notices.map(({ _count, segment, ...n }) => ({
      ...n,
      segment: segment ? (JSON.parse(segment) as Segment) : null,
      recipientCount: segment ? _count.recipients : null,
      readCount: _count.reads,
    })),
  };
}

// How many students a set of filters reaches right now (the composer shows it before sending).
export const audienceCount = (segment: Segment) => prisma.user.count({ where: segmentWhere(segment) });

// The phone's push token, saved on sign-in and removed on sign-out. Upserted by token, so a phone that signs in to
// another account stops getting the previous one's notices.
export const savePushToken = (uid: string, token: string) =>
  prisma.pushToken.upsert({ where: { token }, create: { token, userId: uid }, update: { userId: uid } });
export const dropPushToken = (uid: string, token: string) => prisma.pushToken.deleteMany({ where: { token, userId: uid } });
