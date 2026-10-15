import { DEFAULT_WEIGHTS } from "../../scoring/domain/scoring";
import { projectRepo } from "../../manuscripts/infrastructure/project-repo";
import { CODE, PROJECT_ID, decorate, type SharedProject } from "../domain/group";
import { groupRepo } from "../infrastructure/group-repo";

// Which projects a student can open: their own, plus the ones shared with them through a group (addendum Q10).

export async function listProjects(uid: string): Promise<SharedProject[]> {
  const [own, memberships] = await Promise.all([projectRepo.list(uid), groupRepo.membershipsOf(uid)]);
  const list: SharedProject[] = [...own];
  for (const m of memberships) {
    const p = await projectRepo.get(m.group.ownerId, m.group.projectId);
    if (!p) continue;
    const shared = decorate(p, m.group, m, uid, DEFAULT_WEIGHTS);
    const i = list.findIndex((x) => x.id === shared.id);
    if (i >= 0) list[i] = shared;
    else list.push(shared);
  }
  return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function accessibleProject(uid: string, id: string): Promise<SharedProject | null> {
  if (!PROJECT_ID.test(id)) return null;
  if (id.startsWith("group-")) {
    const code = id.slice(6);
    if (!CODE.test(code)) return null;
    const g = await groupRepo.byCode(code);
    const member = g?.members.find((m) => m.userId === uid);
    if (!g || !member) return null;
    const p = await projectRepo.get(g.ownerId, g.projectId);
    return p && decorate(p, g, member, uid, DEFAULT_WEIGHTS);
  }
  const p = await projectRepo.get(uid, id);
  if (!p) return null;
  const g = await groupRepo.ofProject(p.id);
  const member = g?.members.find((m) => m.userId === uid);
  return g && member ? decorate(p, g, member, uid, DEFAULT_WEIGHTS) : p;
}
