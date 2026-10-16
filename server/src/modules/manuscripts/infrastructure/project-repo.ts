import { Prisma, prisma, type Tx } from "../../../shared/prisma";
import { STALE_ERROR, STALE_MS, type Analysis, type Project } from "../domain/manuscript";
import type { Rubric } from "../domain/rubric";

const include = {
  analysis: true,
  rubric: { include: { criteria: { orderBy: { position: "asc" } } } },
} satisfies Prisma.ProjectInclude;
type Row = Prisma.ProjectGetPayload<{ include: typeof include }>;
type Db = Tx | typeof prisma;

function toAnalysis(a: NonNullable<Row["analysis"]>): Analysis {
  const { projectId: _, model, ...fields } = a;
  return { ...fields, ...(model && { model }) };
}

function toRubric(r: NonNullable<Row["rubric"]>): Rubric {
  return {
    source: r.source,
    criteria: r.criteria.map((c) => ({
      name: c.name,
      desc: c.description,
      points: c.points,
      weight: c.weight,
      scored: c.scored,
      levels: [c.level1, c.level3, c.level5],
    })),
  };
}

// A row as the app knows it. An analysis that stopped updating (the server restarted mid-job) reads as failed.
export function toProject(row: Row): Project {
  const stale = row.status === "analyzing" && Date.now() - row.updatedAt.getTime() > STALE_MS;
  return {
    id: row.id,
    name: row.name,
    domain: row.domain,
    fileName: row.fileName,
    sizeBytes: row.sizeBytes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    status: stale ? "failed" : row.status,
    ...((stale || row.error) && { error: stale ? STALE_ERROR : row.error! }),
    ...(row.analysis && { analysis: toAnalysis(row.analysis) }),
    ...(row.confirmedAt && { confirmedAt: row.confirmedAt.toISOString() }),
    ...(row.weights.length && { weights: row.weights }),
    ...(row.rubric && { rubric: toRubric(row.rubric) }),
  };
}

const analysisData = (a: Analysis) => {
  const { model, ...fields } = a;
  return { ...fields, model: model ?? null };
};

export const projectRepo = {
  async get(ownerId: string, id: string, db: Db = prisma): Promise<Project | null> {
    const row = await db.project.findFirst({ where: { id, userId: ownerId }, include });
    return row && toProject(row);
  },

  async list(ownerId: string): Promise<Project[]> {
    const rows = await prisma.project.findMany({ where: { userId: ownerId }, include, orderBy: { createdAt: "desc" } });
    return rows.map(toProject);
  },

  // Manuscripts that hold a plan slot: everything except failed uploads.
  // A failed upload holds nothing (the file is never stored, and there is no analysis): remove it once the student has
  // had time to see why it failed (issue #10). The app also deletes it as soon as it shows the reason.
  purgeFailed: (ownerId: string, before: Date) =>
    prisma.project.deleteMany({ where: { userId: ownerId, status: "failed", updatedAt: { lt: before } } }),

  countHeld: (tx: Tx, ownerId: string) => tx.project.count({ where: { userId: ownerId, status: { not: "failed" } } }),

  create: (tx: Tx, ownerId: string, p: Project) =>
    tx.project.create({
      data: { id: p.id, userId: ownerId, name: p.name, domain: p.domain, fileName: p.fileName, sizeBytes: p.sizeBytes, status: p.status },
    }),

  // The background read finished. Nothing happens if the student deleted the project meanwhile.
  async finishAnalysis(id: string, result: { analysis: Analysis } | { error: string }) {
    await prisma.$transaction(async (tx) => {
      const exists = await tx.project.findUnique({ where: { id }, select: { id: true } });
      if (!exists) return;
      if ("analysis" in result) {
        await tx.analysis.create({ data: { projectId: id, ...analysisData(result.analysis) } });
        await tx.project.update({ where: { id }, data: { status: "ready", error: null } });
      } else await tx.project.update({ where: { id }, data: { status: "failed", error: result.error } });
    });
  },

  // The student's corrections, and "Looks right".
  async saveAnalysis(id: string, analysis: Analysis, confirm: boolean) {
    await prisma.$transaction([
      prisma.analysis.update({ where: { projectId: id }, data: analysisData(analysis) }),
      prisma.project.update({ where: { id }, data: { updatedAt: new Date(), ...(confirm && { confirmedAt: new Date() }) } }),
    ]);
  },

  // The panel's own rubric replaces the default; weights go back to the default five (and drop the panel's).
  async saveRubric(id: string, choice: { rubric: Rubric } | { weights: number[] }) {
    await prisma.$transaction(async (tx) => {
      await tx.rubric.deleteMany({ where: { projectId: id } });
      if ("rubric" in choice)
        await tx.rubric.create({
          data: {
            projectId: id,
            source: choice.rubric.source,
            criteria: {
              create: choice.rubric.criteria.map((c, position) => ({
                position,
                name: c.name,
                description: c.desc,
                points: c.points,
                weight: c.weight,
                scored: c.scored,
                level1: c.levels[0],
                level3: c.levels[1],
                level5: c.levels[2],
              })),
            },
          },
        });
      else await tx.project.update({ where: { id }, data: { weights: choice.weights } });
      await tx.project.update({ where: { id }, data: { updatedAt: new Date() } });
    });
  },

  // Deleting a project drops its analysis, rubric and group for good (the raw file was never kept).
  remove: (ownerId: string, id: string) => prisma.project.deleteMany({ where: { id, userId: ownerId } }),
};
