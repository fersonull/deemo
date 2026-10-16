import { getAuth } from "../../../shared/auth/firebase";
import { AppError } from "../../../shared/errors";
import { prisma } from "../../../shared/prisma";
import { dailyUsage } from "../domain/daily";
import { PAGE_SIZE, userWhere, type UserFilter } from "../domain/filters";

// Views of the students for the web admin (client/web/admin). Nothing here writes; changes are in actions.ts.

export const SESSIONS_PAGE_SIZE = 10;

export async function listUsers(filter: UserFilter, page: number) {
  const where = userWhere(filter);
  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        provider: true,
        emailVerified: true,
        premium: true,
        course: true,
        createdAt: true,
        deletedAt: true,
        sessionDay: true,
        sessionCount: true,
        _count: { select: { projects: true, sessions: true } },
      },
    }),
  ]);
  const last = await prisma.session.groupBy({
    by: ["userId"],
    where: { userId: { in: users.map((u) => u.id) } },
    _max: { createdAt: true },
  });
  const lastBy = new Map(last.map((l) => [l.userId, l._max.createdAt]));
  return {
    total,
    page,
    pageSize: PAGE_SIZE,
    users: users.map(({ _count, sessionDay, sessionCount, ...u }) => ({
      ...u,
      ...dailyUsage({ premium: u.premium, sessionDay, sessionCount }),
      projects: _count.projects,
      sessions: _count.sessions,
      lastSessionAt: lastBy.get(u.id) ?? null,
    })),
  };
}

export async function getUser(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      provider: true,
      emailVerified: true,
      premium: true,
      allowTyping: true,
      course: true,
      consentVersion: true,
      consentAt: true,
      sessionDay: true,
      sessionCount: true,
      createdAt: true,
      deletedAt: true,
      projects: { orderBy: { createdAt: "desc" }, select: { id: true, name: true, domain: true, status: true, createdAt: true } },
      memberships: { select: { groupCode: true, joinedAt: true, group: { select: { ownerId: true } } } },
      _count: { select: { sessions: true } },
    },
  });
  if (!user) throw new AppError(404, "No such user.");

  // Sign-in facts live in Firebase only. A missing Firebase user (deleted there) reads as unknown, not an error.
  const firebase = await getAuth()
    .getUser(id)
    .then((u) => ({ disabled: u.disabled, lastSignInAt: u.metadata.lastSignInTime ?? null }))
    .catch(() => null);

  const { memberships, _count, ...rest } = user;
  return {
    ...rest,
    totalSessions: _count.sessions,
    ...dailyUsage(rest),
    groups: memberships.map((m) => ({ code: m.groupCode, role: m.group.ownerId === id ? "owner" : "member", joinedAt: m.joinedAt })),
    firebase,
  };
}

// A student's sessions, newest first, a page at a time (the user sheet pages through them).
export async function listUserSessions(id: string, page: number) {
  const where = { userId: id };
  const [total, sessions] = await Promise.all([
    prisma.session.count({ where }),
    prisma.session.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * SESSIONS_PAGE_SIZE,
      take: SESSIONS_PAGE_SIZE,
      select: { id: true, mode: true, status: true, title: true, createdAt: true, report: { select: { score: true, band: true } } },
    }),
  ]);
  return {
    total,
    page,
    pageSize: SESSIONS_PAGE_SIZE,
    sessions: sessions.map(({ report, ...s }) => ({ ...s, score: report?.score ?? null, band: report?.band ?? null })),
  };
}
