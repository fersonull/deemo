import { Busy, generateObject } from "../../../shared/ai/gemini";
import { AppError, BUSY } from "../../../shared/errors";
import { accessibleProject } from "../../groups/application/access";
import { SAMPLE_MANUSCRIPT, manuscriptFacts, type PanelSetup } from "../../practice/domain/panel";
import { DEFAULT_WEIGHTS, delivery } from "../domain/scoring";
import {
  Judgment,
  buildReport,
  coverage,
  judgeSchema,
  judgedCriteria,
  scoringPrompt,
  unscored,
  type EndedBy,
  type LiveFlag,
  type Report,
  type Session,
  type SessionLine,
  type SessionTurn,
  type Unscored,
} from "../domain/session";
import { sessionRepo } from "../infrastructure/session-repo";

export type FinishedSession = PanelSetup & {
  turns: SessionTurn[];
  lines: SessionLine[];
  flags: LiveFlag[];
  weights: number[] | null; // null: the app sent none usable
  durationMs: number;
  endedBy: EndedBy;
};

// A finished session (plan F14): saved right away with a snapshot of the manuscript and rubric it was practiced on,
// then scored in the background (Flash for rubric levels and feedback, code for the score). The app polls.
export async function createSession(uid: string, body: FinishedSession): Promise<Session> {
  const project = body.projectId ? await accessibleProject(uid, body.projectId) : null;
  if (body.projectId && (!project?.analysis || !project.confirmedAt)) throw new AppError(400, "invalid session");
  const session = await sessionRepo.create(uid, {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    status: "scoring",
    projectId: project?.id,
    groupCode: project?.group?.code,
    focusArea: project?.group?.focusArea,
    weakFrom: body.weakFrom,
    manuscriptContext: project?.analysis ? manuscriptFacts(project.analysis) : SAMPLE_MANUSCRIPT,
    title: project?.analysis?.title || project?.name || "Sample paper (ReqTrack)",
    mode: body.mode,
    domain: body.domain,
    minutes: body.minutes,
    panelists: body.panelists,
    followUps: body.followUps,
    difficulty: body.difficulty,
    durationMs: body.durationMs,
    endedBy: body.endedBy,
    weights: project?.rubric ? project.rubric.criteria.map((c) => c.weight) : (project?.weights ?? body.weights ?? DEFAULT_WEIGHTS),
    ...(project?.rubric && { rubric: project.rubric.criteria }),
    turns: body.turns,
    lines: body.lines,
    flags: body.flags,
  });
  void scoreInBackground(session);
  return session;
}

export async function rescore(uid: string, id: string): Promise<Session> {
  const session = await sessionRepo.resetForScoring(uid, id);
  if (!session) throw new AppError(404, "not found");
  void scoreInBackground(session);
  return session;
}

async function judge(s: Unscored): Promise<Report> {
  const criteria = judgedCriteria(s, delivery(s.turns).why);
  const { value, model } = await generateObject(
    {
      contents: [{ role: "user", parts: [{ text: scoringPrompt(s, s.manuscriptContext ?? SAMPLE_MANUSCRIPT, criteria) }] }],
      // temperature 0: the same answers get the same levels
      generationConfig: { responseMimeType: "application/json", responseJsonSchema: judgeSchema(criteria.keys), temperature: 0 },
    },
    Judgment,
  );
  return buildReport(s, value, model);
}

async function scoreInBackground(s: Unscored) {
  try {
    // Nothing answered: no score and no AI call.
    await sessionRepo.saveReport(s.id, coverage(s).answered === 0 ? unscored(s) : await judge(s));
  } catch (err) {
    console.error("scoring", s.id, err);
    const error = err instanceof Busy ? BUSY : "We couldn't score this session. Try again.";
    await sessionRepo.markFailed(s.id, error).catch((e) => console.error("scoring save", s.id, e));
  }
}

export const listHistory = (uid: string) => sessionRepo.listSummaries(uid);
export const getSession = (uid: string, id: string) => sessionRepo.get(uid, id);
export const listSessions = (uid: string) => sessionRepo.listFull(uid);
