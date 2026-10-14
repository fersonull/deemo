import { BadReply, Busy } from "../../../shared/ai/gemini";
import { AppError, BUSY } from "../../../shared/errors";
import { withSerializable } from "../../../shared/prisma";
import type { Account } from "../../identity/domain/account";
import { MANUSCRIPT_LIMIT_MESSAGE, planOf } from "../../identity/domain/plan";
import { accessibleProject } from "../../groups/application/access";
import { leaveGroup } from "../../groups/application/groups";
import { groupRepo } from "../../groups/infrastructure/group-repo";
import { Rejected, applyEdits, type DocType, type FIELDS, type Project } from "../domain/manuscript";
import type { Rubric } from "../domain/rubric";
import { projectRepo } from "../infrastructure/project-repo";
import { analyzeManuscript } from "./read-documents";

export type Upload = { bytes: Uint8Array; type: DocType; size: number; name: string; domain: string; fileName: string };

// Upload a manuscript (plan F1). The plan's manuscript slot is checked and taken in one serializable transaction, so
// two uploads at once can't both fit a free account; the analysis then runs in the background and the app polls.
export async function uploadManuscript(account: Account, u: Upload): Promise<Project> {
  const project: Project = {
    id: crypto.randomUUID(),
    name: u.name,
    domain: u.domain,
    fileName: u.fileName,
    sizeBytes: u.size,
    createdAt: new Date().toISOString(),
    status: "analyzing",
  };
  await withSerializable(async (tx) => {
    const held = (await projectRepo.countHeld(tx, account.id)) + (await groupRepo.countJoined(tx, account.id));
    if (held >= planOf(account.premium).manuscripts) throw new AppError(403, MANUSCRIPT_LIMIT_MESSAGE);
    await projectRepo.create(tx, account.id, project);
  });
  void readInBackground(project.id, u.bytes, u.type);
  return project;
}

async function readInBackground(id: string, bytes: Uint8Array, type: DocType) {
  try {
    await projectRepo.finishAnalysis(id, { analysis: await analyzeManuscript(bytes, type) });
  } catch (err) {
    if (!(err instanceof Rejected)) console.error("analysis", id, err);
    const error =
      err instanceof Rejected
        ? err.message
        : err instanceof Busy
          ? BUSY
          : err instanceof BadReply
            ? "The AI's reading came back incomplete. Try uploading again."
            : "We couldn't read this file. Try a text-based PDF or a DOCX.";
    await projectRepo.finishAnalysis(id, { error }).catch((e) => console.error("analysis save", id, e));
  }
}

async function ownedForEditing(uid: string, id: string, who: string) {
  const p = await accessibleProject(uid, id);
  if (!p) throw new AppError(404, "Project not found.");
  if (p.group && !p.group.isOwner) throw new AppError(403, `Only the group leader can edit the ${who}.`);
  return p;
}

// The student's corrections to the summary, and "Looks right" (confirm).
export async function editAnalysis(
  uid: string,
  id: string,
  edits: Partial<Record<(typeof FIELDS)[number], string>> & { facts?: string[] },
  confirm: boolean,
) {
  const p = await ownedForEditing(uid, id, "summary");
  if (!p.analysis) throw new AppError(404, "not found");
  await projectRepo.saveAnalysis(p.id, applyEdits(p.analysis, edits), confirm);
  return accessibleProject(uid, p.id);
}

// `{ rubric }` is the panel's own (from /rubric/map, reviewed by the student); `{ weights }` goes back to the default
// five criteria with these weights.
export async function saveRubric(uid: string, id: string, choice: { rubric: Rubric } | { weights: number[] }) {
  const p = await ownedForEditing(uid, id, "shared rubric");
  await projectRepo.saveRubric(p.id, choice);
  return accessibleProject(uid, p.id);
}

// Deleting drops the analysis for good; "deleting" a project shared with you leaves its group instead.
export async function removeProject(uid: string, id: string) {
  if (id.startsWith("group-")) return leaveGroup(uid, id.slice(6));
  await projectRepo.remove(uid, id);
}
