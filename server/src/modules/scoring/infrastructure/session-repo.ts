import { Prisma, prisma } from "../../../shared/prisma";
import type { RubricCriterion } from "../../manuscripts/domain/rubric";
import { STALE_ERROR, STALE_MS } from "../../manuscripts/domain/manuscript";
import type { Report, Session, SessionLine, Unscored } from "../domain/session";

const ordered = { orderBy: { position: "asc" } } as const;
const include = {
  turns: ordered,
  flags: ordered,
  report: { include: { criteria: ordered, contradictions: ordered, turns: ordered, fixes: ordered } },
} satisfies Prisma.SessionInclude;
type Row = Prisma.SessionGetPayload<{ include: typeof include }>;
type ReportRow = NonNullable<Row["report"]>;

function toReport(r: ReportRow): Report {
  return {
    score: r.score,
    band: r.band,
    message: r.message,
    rubricScore: r.rubricScore,
    penalty: r.penalty,
    answered: r.answered,
    planned: r.planned,
    scored: r.scored,
    ...(r.model && { model: r.model }),
    criteria: r.criteria.map(({ key, name, weight, level, why }) => ({ key, name, weight, level, why })),
    contradictions: r.contradictions.map(({ spokenClaim, manuscriptEvidence, severity, turn }) => ({
      spokenClaim,
      manuscriptEvidence,
      severity,
      turn,
    })),
    turns: r.turns.map(({ feedback, betterAnswer }) => ({ feedback, betterAnswer })),
    fixes: r.fixes.map(({ text, turn }) => ({ text, turn })),
    headline: r.headline,
    delivery: { latencyS: r.latencyS, fillersPerMin: r.fillersPerMin, wordsPerMin: r.wordsPerMin },
  };
}

// A row as the app knows it. Scoring that stopped updating (the server restarted mid-job) reads as failed.
export function toSession(row: Row): Session {
  const stale = row.status === "scoring" && Date.now() - row.updatedAt.getTime() > STALE_MS;
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    status: stale ? "failed" : row.status,
    ...((stale || row.error) && { error: stale ? STALE_ERROR : row.error! }),
    ...(row.projectId && { projectId: row.projectId }),
    ...(row.groupCode && { groupCode: row.groupCode }),
    ...(row.focusArea && { focusArea: row.focusArea }),
    ...(row.weakFrom && { weakFrom: row.weakFrom }),
    ...(row.manuscriptContext && { manuscriptContext: row.manuscriptContext }),
    title: row.title,
    mode: row.mode,
    domain: row.domain,
    minutes: row.minutes,
    ...(row.agenda && { agenda: row.agenda as unknown as { id: string; label: string }[] }),
    panelists: row.panelists,
    followUps: row.followUps,
    difficulty: row.difficulty,
    durationMs: row.durationMs,
    endedBy: row.endedBy,
    weights: row.weights,
    ...(row.rubric && { rubric: row.rubric as unknown as RubricCriterion[] }),
    turns: row.turns.map(({ number, followUp, type, panelist, question, topic, answer, latencyMs, answerMs }) => ({
      number,
      followUp,
      type,
      panelist,
      question,
      ...(topic && { topic }),
      answer,
      latencyMs,
      answerMs,
    })),
    lines: row.lines as unknown as SessionLine[],
    flags: row.flags.map(({ spokenClaim, manuscriptEvidence, severity, atMs }) => ({ spokenClaim, manuscriptEvidence, severity, atMs })),
    ...(row.report && { report: toReport(row.report) }),
  };
}

const reportData = (r: Report) => ({
  score: r.score,
  band: r.band,
  message: r.message,
  scored: r.scored,
  rubricScore: r.rubricScore,
  penalty: r.penalty,
  answered: r.answered,
  planned: r.planned,
  headline: r.headline,
  model: r.model ?? null,
  latencyS: r.delivery.latencyS,
  fillersPerMin: r.delivery.fillersPerMin,
  wordsPerMin: r.delivery.wordsPerMin,
  criteria: { create: r.criteria.map((c, position) => ({ position, ...c })) },
  contradictions: { create: r.contradictions.map((c, position) => ({ position, ...c })) },
  turns: { create: r.turns.map((t, position) => ({ position, ...t })) },
  fixes: { create: r.fixes.map((f, position) => ({ position, ...f })) },
});

export const sessionRepo = {
  async create(uid: string, s: Unscored): Promise<Session> {
    const row = await prisma.session.create({
      data: {
        id: s.id,
        userId: uid,
        status: s.status,
        projectId: s.projectId ?? null,
        groupCode: s.groupCode ?? null,
        focusArea: s.focusArea ?? null,
        weakFrom: s.weakFrom ?? null,
        manuscriptContext: s.manuscriptContext ?? null,
        title: s.title,
        mode: s.mode,
        domain: s.domain,
        minutes: s.minutes,
        ...(s.agenda && { agenda: s.agenda as unknown as Prisma.InputJsonValue }),
        panelists: s.panelists,
        followUps: s.followUps,
        difficulty: s.difficulty,
        durationMs: s.durationMs,
        endedBy: s.endedBy,
        weights: s.weights,
        ...(s.rubric && { rubric: s.rubric as unknown as Prisma.InputJsonValue }),
        lines: s.lines as unknown as Prisma.InputJsonValue,
        turns: { create: s.turns.map((t, position) => ({ position, ...t })) },
        flags: { create: s.flags.map((f, position) => ({ position, ...f })) },
      },
      include,
    });
    return toSession(row);
  },

  async get(uid: string, id: string): Promise<Session | null> {
    const row = await prisma.session.findFirst({ where: { id, userId: uid }, include });
    return row && toSession(row);
  },

  // Everything kept about the student's sessions (Download my data).
  async listFull(uid: string): Promise<Session[]> {
    const rows = await prisma.session.findMany({ where: { userId: uid }, include, orderBy: { createdAt: "desc" } });
    return rows.map(toSession);
  },

  // History rows: no transcripts, just what the list shows.
  async listSummaries(uid: string) {
    const rows = await prisma.session.findMany({
      where: { userId: uid },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        status: true,
        mode: true,
        title: true,
        durationMs: true,
        report: { select: { score: true, scored: true, band: true, fixes: { ...ordered, take: 1, select: { text: true } } } },
      },
    });
    return rows.map(({ report, createdAt, updatedAt, status, ...s }) => ({
      ...s,
      createdAt: createdAt.toISOString(),
      status: status === "scoring" && Date.now() - updatedAt.getTime() > STALE_MS ? ("failed" as const) : status,
      score: report?.scored === false ? undefined : report?.score, // no score stays out of Home and the trend
      band: report?.band,
      tip: report?.fixes[0]?.text, // the Home card's one line
    }));
  },

  // The background scoring finished. Nothing happens if the student deleted the session (or their data) meanwhile.
  async saveReport(id: string, report: Report) {
    await prisma.$transaction(async (tx) => {
      if (!(await tx.session.findUnique({ where: { id }, select: { id: true } }))) return;
      await tx.report.deleteMany({ where: { sessionId: id } });
      await tx.report.create({ data: { sessionId: id, ...reportData(report) } });
      await tx.session.update({ where: { id }, data: { status: "ready", error: null } });
    });
  },

  markFailed: (id: string, error: string) => prisma.session.updateMany({ where: { id }, data: { status: "failed", error } }),

  // Re-score a session whose scoring failed; its transcript was kept.
  async resetForScoring(uid: string, id: string): Promise<Session | null> {
    const found = await prisma.session.findFirst({ where: { id, userId: uid }, select: { id: true } });
    if (!found) return null;
    await prisma.$transaction([
      prisma.report.deleteMany({ where: { sessionId: id } }),
      prisma.session.update({ where: { id }, data: { status: "scoring", error: null } }),
    ]);
    return this.get(uid, id);
  },
};

// A group member's average readiness over all their scored sessions on that group's project, how many sessions it
// covers, and when they last practiced it (Home's Group readiness card). One good or bad round doesn't swing it.
export async function averageSharedScore(uid: string, code: string) {
  const where = { scored: true, session: { userId: uid, groupCode: code, status: "ready" as const } };
  const [agg, last] = await Promise.all([
    prisma.report.aggregate({ where, _avg: { score: true }, _count: true }),
    prisma.session.findFirst({
      where: { userId: uid, groupCode: code, status: "ready", report: { scored: true } },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);
  const avg = agg._avg?.score;
  if (!agg._count || avg == null || !last) return null;
  return { score: Math.round(avg), sessions: agg._count, createdAt: last.createdAt.toISOString() };
}
