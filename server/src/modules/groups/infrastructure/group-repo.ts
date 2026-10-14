import { prisma, type Tx } from "../../../shared/prisma";

type Db = Tx | typeof prisma;

export const groupRepo = {
  byCode: (code: string, db: Db = prisma) => db.group.findUnique({ where: { code }, include: { members: true } }),

  ofProject: (projectId: string, db: Db = prisma) =>
    db.group.findUnique({ where: { projectId }, include: { members: true } }),

  // Groups the student belongs to (as leader or member), with their own membership row.
  membershipsOf: (uid: string, db: Db = prisma) =>
    db.groupMember.findMany({ where: { userId: uid }, include: { group: true }, orderBy: { joinedAt: "asc" } }),

  // Projects shared with the student by someone else: each takes the free plan's one manuscript slot.
  countJoined: (tx: Tx, uid: string) => tx.groupMember.count({ where: { userId: uid, group: { ownerId: { not: uid } } } }),

  member: (code: string, uid: string, db: Db = prisma) =>
    db.groupMember.findUnique({ where: { groupCode_userId: { groupCode: code, userId: uid } } }),
};
