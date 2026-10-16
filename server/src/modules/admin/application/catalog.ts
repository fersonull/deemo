import { AppError } from "../../../shared/errors";
import { Prisma, prisma } from "../../../shared/prisma";
import { sessionWhere, type SessionFilter } from "../domain/filters";
import { STUCK_MS } from "./overview";

// The admin's cross-student lists: sessions (with a report summary), manuscripts and groups, a page at a time.
// Transcripts, answers and manuscript analyses are deliberately left out (students' unpublished work, RA 10173).

export const LIST_PAGE_SIZE = 25;
const page = (n: number) => ({ skip: (n - 1) * LIST_PAGE_SIZE, take: LIST_PAGE_SIZE });
const owner = { select: { id: true, email: true, name: true } } as const;

export async function listSessions(filter: SessionFilter, n: number) {
  const where = sessionWhere(filter);
  const [total, rows] = await Promise.all([
    prisma.session.count({ where }),
    prisma.session.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...page(n),
      select: {
        id: true,
        title: true,
        mode: true,
        status: true,
        minutes: true,
        panelists: true,
        durationMs: true,
        createdAt: true,
        updatedAt: true,
        user: owner,
        report: { select: { score: true, band: true, scored: true } },
      },
    }),
  ]);
  const stuckBefore = Date.now() - STUCK_MS;
  return {
    total,
    page: n,
    pageSize: LIST_PAGE_SIZE,
    sessions: rows.map(({ report, updatedAt, ...s }) => ({
      ...s,
      stuck: s.status === "scoring" && updatedAt.getTime() < stuckBefore,
      score: report?.scored ? report.score : null,
      band: report?.band ?? null,
    })),
  };
}

// One session's report summary: score, verdict, rubric levels with their reasons, contradictions and fixes.
export async function getSessionReport(id: string) {
  const s = await prisma.session.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      mode: true,
      status: true,
      error: true,
      minutes: true,
      panelists: true,
      followUps: true,
      difficulty: true,
      durationMs: true,
      endedBy: true,
      groupCode: true,
      createdAt: true,
      user: owner,
      report: {
        select: {
          score: true,
          band: true,
          message: true,
          headline: true,
          scored: true,
          rubricScore: true,
          penalty: true,
          answered: true,
          planned: true,
          model: true,
          criteria: { orderBy: { position: "asc" }, select: { name: true, weight: true, level: true, why: true } },
          contradictions: { orderBy: { position: "asc" }, select: { spokenClaim: true, manuscriptEvidence: true, severity: true } },
          fixes: { orderBy: { position: "asc" }, select: { text: true } },
        },
      },
    },
  });
  if (!s) throw new AppError(404, "No such session.");
  return s;
}

export type ProjectFilter = { status?: "analyzing" | "ready" | "failed"; q?: string };

export async function listProjects({ status, q }: ProjectFilter, n: number) {
  const where: Prisma.ProjectWhereInput = {};
  if (status) where.status = status;
  if (q)
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { fileName: { contains: q, mode: "insensitive" } },
      { user: { email: { contains: q, mode: "insensitive" } } },
    ];
  const [total, rows] = await Promise.all([
    prisma.project.count({ where }),
    prisma.project.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...page(n),
      select: {
        id: true,
        name: true,
        domain: true,
        fileName: true,
        sizeBytes: true,
        status: true,
        error: true,
        confirmedAt: true,
        createdAt: true,
        updatedAt: true,
        user: owner,
        rubric: { select: { source: true } },
        group: { select: { code: true } },
      },
    }),
  ]);
  const stuckBefore = Date.now() - STUCK_MS;
  return {
    total,
    page: n,
    pageSize: LIST_PAGE_SIZE,
    projects: rows.map(({ updatedAt, rubric, group, ...p }) => ({
      ...p,
      stuck: p.status === "analyzing" && updatedAt.getTime() < stuckBefore,
      rubric: rubric?.source ?? null,
      groupCode: group?.code ?? null,
    })),
  };
}

export async function listGroups(q: string | undefined, n: number) {
  const where: Prisma.GroupWhereInput = q
    ? {
        OR: [
          { code: { contains: q.toUpperCase() } },
          { project: { name: { contains: q, mode: "insensitive" } } },
          { owner: { email: { contains: q, mode: "insensitive" } } },
        ],
      }
    : {};
  const [total, rows] = await Promise.all([
    prisma.group.count({ where }),
    prisma.group.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...page(n),
      select: {
        code: true,
        createdAt: true,
        owner,
        project: { select: { id: true, name: true } },
        members: {
          orderBy: { joinedAt: "asc" },
          select: { shareScore: true, focusArea: true, joinedAt: true, user: owner },
        },
      },
    }),
  ]);
  return { total, page: n, pageSize: LIST_PAGE_SIZE, groups: rows };
}
