import type { AuthClaims } from "../../../shared/auth/authenticate";
import { AppError } from "../../../shared/errors";
import { isDuplicate, prisma, withSerializable } from "../../../shared/prisma";
import { record } from "../../admin/application/actions";
import { canRead, sameNotice, type NoticeInput } from "../domain/notice";
import { noticeHub } from "../infrastructure/notice-repo";

export async function sendNotice(admin: AuthClaims, input: NoticeInput) {
  const notice = await withSerializable(async (tx) => {
    const existing = await tx.notice.findUnique({ where: { id: input.id } });
    if (existing) {
      if (!sameNotice(existing, input, admin.uid)) throw new AppError(409, "This notice was already sent with different content. Start a new notice.");
      return existing;
    }
    if (input.targetId) {
      const user = await tx.user.findUnique({ where: { id: input.targetId }, select: { deletedAt: true } });
      if (!user || user.deletedAt) throw new AppError(404, "That student is unavailable.");
    }
    const created = await tx.notice.create({ data: { ...input, createdBy: admin.uid } });
    await record(admin, "notice_sent", { id: input.targetId ?? "all", email: null }, tx);
    return created;
  }).catch(async (error: unknown) => {
    if (!isDuplicate(error)) throw error;
    const existing = await prisma.notice.findUnique({ where: { id: input.id } });
    if (!existing || !sameNotice(existing, input, admin.uid)) throw new AppError(409, "This notice ID is already in use. Start a new notice.");
    return existing;
  });
  noticeHub.notify(notice.targetId);
  return { id: notice.id };
}

export async function readNotice(uid: string, id: string) {
  const n = await prisma.notice.findUnique({ where: { id }, select: { targetId: true } });
  if (!n || !canRead(uid, n.targetId)) throw new AppError(404, "Notice not found.");
  await prisma.noticeRead.upsert({ where: { userId_noticeId: { userId: uid, noticeId: id } }, create: { userId: uid, noticeId: id }, update: {} });
  noticeHub.notify(uid);
}

export async function sentNotices(page: number) {
  const [total, notices] = await Promise.all([
    prisma.notice.count(),
    prisma.notice.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * 25, take: 25,
      include: { target: { select: { id: true, name: true, email: true } }, _count: { select: { reads: true } } },
    }),
  ]);
  return { total, page, pageSize: 25, notices: notices.map(({ _count, ...n }) => ({ ...n, readCount: _count.reads })) };
}
