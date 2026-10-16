import { AppError } from "../../../shared/errors";
import { isDuplicate, prisma, withSerializable } from "../../../shared/prisma";
import { defaultAvatar, type Account } from "../../identity/domain/account";
import { MANUSCRIPT_LIMIT_MESSAGE, planOf } from "../../identity/domain/plan";
import { projectRepo } from "../../manuscripts/infrastructure/project-repo";
import { latestSharedScore } from "../../scoring/infrastructure/session-repo";
import { CODE, MAX_MEMBERS, ONE_GROUP_MESSAGE, PROJECT_ID, newCode, sharedId } from "../domain/group";
import { groupRepo } from "../infrastructure/group-repo";
import { accessibleProject } from "./access";

const unavailable = () => new AppError(404, "This group project is no longer available.");

// The leader shares a confirmed manuscript; sharing again returns the same code.
export async function createGroup(account: Account, projectId: string) {
  if (!PROJECT_ID.test(projectId) || projectId.startsWith("group-")) throw unavailable();
  // A random code collision is retried without touching an existing group.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newCode();
    try {
      await withSerializable(async (tx) => {
        const project = await tx.project.findFirst({
          where: { id: projectId, userId: account.id },
          select: { confirmedAt: true, analysis: { select: { projectId: true } }, group: { select: { code: true } } },
        });
        if (!project) throw unavailable();
        if (project.group) return;
        if (await tx.groupMember.count({ where: { userId: account.id } })) throw new AppError(409, ONE_GROUP_MESSAGE);
        if (!project.confirmedAt || !project.analysis) throw new AppError(400, "Review the manuscript summary before sharing it.");
        await tx.group.create({ data: { code, ownerId: account.id, projectId, members: { create: { userId: account.id } } } });
      });
      return accessibleProject(account.id, projectId);
    } catch (err) {
      if (!isDuplicate(err)) throw err;
    }
  }
  throw new AppError(503, "Couldn't create a code. Try again.");
}

// Code guesses are rate-limited at the route (shared/rate-limit.ts, groupJoin).
export async function joinGroup(account: Account, code: string) {
  const uid = account.id;
  const projectId = await withSerializable(async (tx) => {
    const g = await groupRepo.byCode(code, tx);
    if (!g) throw new AppError(404, "That code didn't match a group. Check it with your leader.");
    const id = sharedId(g.code, g.ownerId, uid, g.projectId);
    if (g.members.some((m) => m.userId === uid)) return id;
    if (g.members.length >= MAX_MEMBERS) throw new AppError(409, `This group is full (${MAX_MEMBERS} members).`);
    if (await tx.groupMember.count({ where: { userId: uid } })) throw new AppError(409, ONE_GROUP_MESSAGE);
    const held = (await projectRepo.countHeld(tx, uid)) + (await groupRepo.countJoined(tx, uid));
    if (held >= planOf(account.premium).manuscripts) throw new AppError(403, MANUSCRIPT_LIMIT_MESSAGE);
    await tx.groupMember.create({ data: { groupCode: g.code, userId: uid } });
    return id;
  });
  return accessibleProject(uid, projectId);
}

export async function updateMember(uid: string, code: string, patch: { shareScore?: boolean; focusArea?: string }) {
  if (!CODE.test(code)) throw unavailable();
  if (!(await groupRepo.member(code, uid))) throw unavailable();
  await prisma.groupMember.update({ where: { groupCode_userId: { groupCode: code, userId: uid } }, data: patch });
}

// The leader leaving dissolves the group; a member leaving drops only their membership. Past sessions stay private.
export async function leaveGroup(uid: string, code: string) {
  if (!CODE.test(code)) throw unavailable();
  await withSerializable(async (tx) => {
    const g = await groupRepo.byCode(code, tx);
    if (!g || !g.members.some((m) => m.userId === uid)) throw unavailable();
    if (g.ownerId === uid) await tx.group.delete({ where: { code } });
    else await tx.groupMember.delete({ where: { groupCode_userId: { groupCode: code, userId: uid } } });
  });
}

// Home's Group readiness card: each member's face, name and plan, and their latest shared score.
export async function groupReadiness(uid: string) {
  const memberships = await groupRepo.membershipsOf(uid);
  return Promise.all(
    memberships.map(async ({ group }) => {
      const [g, project] = await Promise.all([
        prisma.group.findUnique({
          where: { code: group.code },
          include: { members: { include: { user: true }, orderBy: { joinedAt: "asc" } } },
        }),
        projectRepo.get(group.ownerId, group.projectId),
      ]);
      const members = await Promise.all(
        (g?.members ?? []).map(async (m) => {
          const base = {
            name: m.user.name || "Group member",
            avatar: m.user.avatar ?? defaultAvatar(m.userId),
            premium: m.user.premium,
            isYou: m.userId === uid,
            sharing: m.shareScore,
          };
          if (!m.shareScore) return base;
          const latest = await latestSharedScore(m.userId, group.code);
          return { ...base, ...(latest && { score: latest.score, mode: latest.mode, createdAt: latest.createdAt }) };
        }),
      );
      return {
        code: group.code,
        projectId: sharedId(group.code, group.ownerId, uid, group.projectId),
        title: project?.analysis?.title || project?.name || "Group project",
        members,
      };
    }),
  );
}
