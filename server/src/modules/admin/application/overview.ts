import { prisma } from "../../../shared/prisma";
import { fillDays, type DayCount } from "../domain/days";

// The admin's first page: headline counts, sign-ups and sessions per day, and what needs attention (failed or stuck
// manuscript analyses and scoring). Days are Philippine calendar days, like the daily practice cap.

const DAY_MS = 24 * 60 * 60_000;
export const STUCK_MS = 5 * 60_000; // analyzing or scoring this long reads as failed in the app too
const CHART_DAYS = 30;

const perDay = (table: "users" | "sessions", since: Date) =>
  prisma.$queryRawUnsafe<DayCount[]>(
    `SELECT to_char((created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila')::date, 'YYYY-MM-DD') AS day, count(*)::int AS n
       FROM ${table} WHERE created_at >= $1 GROUP BY 1 ORDER BY 1`,
    since,
  );

export async function overview() {
  const now = Date.now();
  const week = new Date(now - 7 * DAY_MS);
  const since = new Date(now - CHART_DAYS * DAY_MS);
  const stuck = new Date(now - STUCK_MS);
  const [users, verified, premium, newThisWeek, sessionsThisWeek, avg, signups, sessions, failedProjects, failedSessions] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { emailVerified: true } }),
    prisma.user.count({ where: { premium: true } }),
    prisma.user.count({ where: { createdAt: { gte: week } } }),
    prisma.session.count({ where: { createdAt: { gte: week } } }),
    prisma.report.aggregate({ _avg: { score: true }, _count: true, where: { scored: true, session: { createdAt: { gte: since } } } }),
    perDay("users", since),
    perDay("sessions", since),
    prisma.project.findMany({
      where: { OR: [{ status: "failed" }, { status: "analyzing", updatedAt: { lt: stuck } }] },
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: { id: true, name: true, status: true, error: true, updatedAt: true, user: { select: { id: true, email: true, name: true } } },
    }),
    prisma.session.findMany({
      where: { OR: [{ status: "failed" }, { status: "scoring", updatedAt: { lt: stuck } }] },
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: { id: true, title: true, mode: true, status: true, error: true, updatedAt: true, user: { select: { id: true, email: true, name: true } } },
    }),
  ]);
  return {
    counts: { users, verified, premium, newThisWeek, sessionsThisWeek },
    readiness: { average: avg._avg.score === null ? null : Math.round(avg._avg.score), scored: avg._count, days: CHART_DAYS },
    signups: fillDays(signups, CHART_DAYS, now),
    sessions: fillDays(sessions, CHART_DAYS, now),
    attention: {
      projects: failedProjects.map((p) => ({ ...p, stuck: p.status === "analyzing" })),
      sessions: failedSessions.map((s) => ({ ...s, stuck: s.status === "scoring" })),
    },
  };
}
