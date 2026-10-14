import { AppError } from "../../../shared/errors";
import { withSerializable } from "../../../shared/prisma";
import type { Account } from "../../identity/domain/account";
import { accessibleProject } from "../../groups/application/access";
import { getSession } from "../../scoring/application/sessions";
import { weakTopics } from "../../scoring/domain/session";
import { NEW_SESSION_MS, decideFinish, decideStart } from "../domain/live-start";
import { LIVE_MODEL, type PanelSetup } from "../domain/panel";
import { mintLiveToken } from "../infrastructure/gemini-live";
import { liveStartRepo } from "../infrastructure/live-start-repo";

export type TokenRequest = Omit<PanelSetup, "focusArea" | "weakTopics"> & { startId: string; resume: boolean };

// The app calls this before every connect, including reconnects (the resumption handle carries the session).
export async function issueLiveToken(account: Account, req: TokenRequest) {
  const { startId, resume, ...setup } = req;
  const fingerprint = JSON.stringify(setup); // what the app chose; the server-added fields below aren't part of it
  const panel: PanelSetup = { ...setup };
  const project = setup.projectId ? await accessibleProject(account.id, setup.projectId) : null;
  if (setup.projectId && (!project?.analysis || !project.confirmedAt))
    throw new AppError(403, "This manuscript is unavailable. Choose a reviewed project.");
  panel.focusArea = project?.group?.focusArea;
  if (setup.weakFrom) {
    const last = await getSession(account.id, setup.weakFrom); // the student's own session only
    if (!last?.report || last.report.scored === false) throw new AppError(404, "That report can't start a weak-topics round.");
    panel.weakTopics = weakTopics(last.report);
  }

  // Reserve the start (and today's slot) before minting.
  const lease = crypto.randomUUID();
  const decision = await withSerializable(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({ where: { id: account.id } });
    if (user.deletedAt) throw new AppError(403, "This account is being deleted.");
    const d = decideStart({
      previous: await liveStartRepo.find(tx, account.id, startId),
      account: user,
      setup: panel,
      fingerprint,
      resume,
      lease,
      now: Date.now(),
    });
    if (d.kind !== "cached") await liveStartRepo.save(tx, account.id, startId, d.start);
    if (d.kind === "new") await tx.user.update({ where: { id: account.id }, data: { sessionDay: d.day, sessionCount: d.count } });
    return d;
  });
  if (decision.kind === "cached") return { token: decision.start.token!, model: LIVE_MODEL };

  let token: string | undefined;
  const newSessionUntil = Date.now() + NEW_SESSION_MS;
  try {
    token = await mintLiveToken(panel, project?.analysis, decision.start.expiresAt, newSessionUntil);
  } finally {
    // Save the token for retries and resumption, or refund the slot if minting failed.
    await finish(account.id, startId, decision.start.lease, token, newSessionUntil);
  }
  return { token, model: LIVE_MODEL };
}

async function finish(uid: string, startId: string, lease: string, token: string | undefined, newSessionUntil: number) {
  await withSerializable(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: uid } });
    if (!user) return;
    const start = await liveStartRepo.find(tx, uid, startId);
    const d = decideFinish({ start, account: user, lease, token, newSessionUntil });
    if (d.kind === "save") await liveStartRepo.save(tx, uid, startId, { ...start!, token: d.token, newSessionUntil: d.newSessionUntil });
    if (d.kind === "refund") {
      await liveStartRepo.remove(tx, uid, startId);
      if (d.count !== null) await tx.user.update({ where: { id: uid }, data: { sessionCount: d.count } });
    }
  });
}
