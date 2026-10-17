import { prisma } from "../../../shared/prisma";
import { visibleTo } from "../domain/notice";
import { NoticeHub } from "./change-hub";

export const noticeHub = new NoticeHub(async () => {
  // Recent rows catch commits that arrive out of ID order. Reconnecting always reloads the full inbox page.
  const [notices, reads] = await Promise.all([
    prisma.notice.findMany({ orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 200, select: { id: true, targetId: true } }),
    prisma.noticeRead.findMany({ orderBy: [{ readAt: "desc" }, { noticeId: "desc" }, { userId: "desc" }], take: 200, select: { noticeId: true, userId: true } }),
  ]);
  return [
    ...notices.map((n) => ({ key: `notice:${n.id}`, targetId: n.targetId })),
    ...reads.map((r) => ({ key: `read:${r.noticeId}:${r.userId}`, targetId: r.userId })),
  ];
});

export async function inbox(uid: string, before?: string) {
  const where = visibleTo(uid);
  const [rows, unread] = await Promise.all([
    prisma.notice.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 31,
      ...(before && { cursor: { id: before }, skip: 1 }),
      include: { reads: { where: { userId: uid }, select: { readAt: true } } },
    }),
    prisma.notice.count({ where: { ...where, reads: { none: { userId: uid } } } }),
  ]);
  const page = rows.slice(0, 30);
  return {
    notices: page.map((n) => ({ id: n.id, title: n.title, body: n.body, createdAt: n.createdAt, readAt: n.reads[0]?.readAt ?? null })),
    unread,
    nextCursor: rows.length > 30 ? page.at(-1)!.id : null,
  };
}
