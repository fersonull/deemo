import { File } from "expo-file-system";

import { DEFAULT_WEIGHTS, type Course, type Domain } from "@/constants";
import { practiceSetup } from "@/hooks/use-practice-setup";
import { api } from "@/utils/api";
import { freshFor } from "@/utils/fresh";
import { optimisticValue } from "@/utils/optimistic-value";
import { createStore } from "@/utils/store";

// Mirrors server/src/modules/manuscripts/domain/manuscript.ts. The server keeps projects; the app only caches the list.
export type Analysis = {
  title: string;
  problem: string;
  objectives: string;
  method: string;
  scope: string;
  features: string;
  limits: string;
  results: string;
  facts: string[];
  unsure: string[];
  field?: Course; // detected from the manuscript (none on older analyses); the panel follows it
};

// The panel's own rubric (plan F3), replacing the default five criteria. Mirrors server/src/modules/manuscripts/domain/rubric.ts.
export type RubricCriterion = {
  name: string;
  desc: string;
  points: number; // as written on the form
  weight: number; // whole percent; the scored criteria total 100
  scored: boolean; // false: needs the paper or a live demo, so practice can't judge it
  levels: [string, string, string]; // a 1, a 3 and a 5
};
export type Rubric = { source: string; criteria: RubricCriterion[] };

export type Project = {
  weights?: number[]; // the default rubric's weights
  rubric?: Rubric;
  group?: { code: string; isOwner: boolean; shareScore: boolean; focusArea: string };
  id: string;
  name: string;
  domain: Domain;
  fileName: string;
  sizeBytes: number;
  createdAt: string;
  status: "analyzing" | "ready" | "failed";
  error?: string;
  analysis?: Analysis;
  confirmedAt?: string;
};

export type PickedFile = { uri: string; name: string; mimeType?: string; size?: number };

export type GroupReadiness = {
  code: string;
  projectId: string;
  title: string;
  members: { name: string; avatar: string; premium: boolean; isYou: boolean; sharing: boolean; score?: number; sessions?: number; createdAt?: string }[]; // score: average over their scored sessions on the project
};
const store = createStore({ projects: [] as Project[], groups: [] as GroupReadiness[], loaded: false, error: false, savingMembers: [] as string[] });
let generation = 0;
let revision = 0;
type Membership = NonNullable<Project["group"]>;
const memberWrites = new Map<string, ReturnType<typeof optimisticValue<Membership>>>();
// Opening a screen reuses a list loaded in the last minute, unless a manuscript is still being analyzed.
const fresh = freshFor(60_000);
const json = (method: string, body: object) => ({
  method,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

export const useProjects = store.use;

function upsert(p: Project) {
  const rest = store.get().projects.filter((x) => x.id !== p.id);
  store.set({ projects: [p, ...rest].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) });
  if (practiceSetup.get().projectId === p.id && p.weights) practiceSetup.set({ weights: p.weights });
  return p;
}

// The newest reviewed project is the one practice uses, unless the student picked another.
function pickActive(projects: Project[]) {
  const { projectId } = practiceSetup.get();
  const current = projects.find((p) => p.id === projectId && p.analysis);
  if (current) {
    if (current.weights) practiceSetup.set({ weights: current.weights });
    return;
  }
  const latest = projects.find((p) => p.analysis && p.confirmedAt);
  practiceSetup.set(
    latest
      ? { projectId: latest.id, domain: latest.domain, weights: latest.weights ?? DEFAULT_WEIGHTS }
      : { projectId: null, weights: DEFAULT_WEIGHTS },
  );
}

export const projects = {
  // Signed out: drop the last student's list and active manuscript.
  reset() {
    generation++;
    revision++;
    for (const write of memberWrites.values()) write.reset();
    memberWrites.clear();
    fresh.invalidate();
    store.set({ projects: [], groups: [], loaded: false, error: false, savingMembers: [] });
    practiceSetup.set({ projectId: null, weights: DEFAULT_WEIGHTS });
  },

  // `force`: pull to refresh, or an action that changed the list on the server.
  refresh(force = false) {
    if (store.get().savingMembers.length) return Promise.resolve();
    const pending = store.get().projects.some((p) => p.status === "analyzing");
    return fresh.run(async () => {
      const started = generation;
      const readRevision = revision;
      try {
        const [list, groups] = await Promise.all([api<Project[]>("/projects"), api<GroupReadiness[]>("/groups")]);
        if (started !== generation || readRevision !== revision) return false;
        store.set({ projects: list, groups, loaded: true, error: false });
        pickActive(list);
        return true;
      } catch {
        if (started === generation && readRevision === revision) store.set({ loaded: true, error: true });
        return false;
      }
    }, force || pending);
  },

  async get(id: string) {
    const started = generation;
    const readRevision = revision;
    const p = await api<Project>(`/projects/${id}`);
    return started === generation && readRevision === revision && !store.get().savingMembers.includes(id) ? upsert(p) : p;
  },

  // Expo's fetch only takes Blob-like parts (RN's { uri, name, type } object throws "Unsupported FormDataPart"),
  // so the picked file goes in as an expo-file-system File. Its cached copy may be renamed, so the original
  // name travels as a field. The server checks the type from the content and keeps only the analysis.
  async upload(file: PickedFile, name: string, domain: Domain) {
    const form = new FormData();
    form.append("file", new File(file.uri) as unknown as Blob);
    form.append("fileName", file.name);
    form.append("name", name);
    form.append("domain", domain);
    return upsert(await api<Project>("/projects", { method: "POST", body: form }));
  },

  // `domain`: a corrected IT field (saved on the project).
  async saveAnalysis(id: string, analysis: Partial<Analysis>, confirm = false, domain?: Domain) {
    const p = await api<Project>(`/projects/${id}/analysis`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ analysis: { ...analysis, ...(domain && { domain }) }, confirm }),
    });
    if (practiceSetup.get().projectId === p.id) practiceSetup.set({ domain: p.domain }); // the active manuscript's IT field
    return upsert(p);
  },

  use(p: Project) {
    practiceSetup.set({ projectId: p.id, domain: p.domain, weights: p.weights ?? DEFAULT_WEIGHTS });
  },

  async createGroup(id: string) {
    return upsert(await api<Project>(`/projects/${id}/group`, { method: "POST" }));
  },
  async join(code: string) {
    const p = upsert(await api<Project>("/groups/join", json("POST", { code })));
    this.use(p);
    return p;
  },
  async updateMember(p: Project, patch: { shareScore?: boolean; focusArea?: string }) {
    const current = store.get().projects.find((x) => x.id === p.id);
    if (!current?.group) return;
    const pending = memberWrites.get(p.id);
    if (pending?.saving) return pending.set(current.group);
    const code = current.group.code;
    const started = generation;
    const previousMember = store.get().groups.find((g) => g.code === code)?.members.find((m) => m.isYou);
    const change = optimisticValue(
      () => current.group!,
      (group, saving) => {
        revision++;
        fresh.invalidate();
        const state = store.get();
        store.set({
          projects: state.projects.map((x) => x.id === p.id && x.group?.code === code ? { ...x, group } : x),
          savingMembers: [...state.savingMembers.filter((id) => id !== p.id), ...(saving ? [p.id] : [])],
          groups: state.groups.map((g) => g.code !== code ? g : {
            ...g,
            members: g.members.map((m) => !m.isYou ? m : {
              ...m, sharing: group.shareScore,
              score: group.shareScore ? previousMember?.score : undefined,
              sessions: group.shareScore ? previousMember?.sessions : undefined,
              createdAt: group.shareScore ? previousMember?.createdAt : undefined,
            }),
          }),
        });
      },
      async (group) => {
        await api(`/groups/${code}/me`, json("PATCH", patch));
        return group;
      },
    );
    memberWrites.set(p.id, change);
    try {
      await change.set({ ...current.group, ...patch, ...(patch.focusArea !== undefined && { focusArea: patch.focusArea.trim() }) });
      // The save is confirmed. A failed roster refresh must not roll it back or replace the screen with Offline.
      if (started === generation) {
        const readRevision = revision;
        void api<GroupReadiness[]>("/groups").then((groups) => {
          if (started === generation && readRevision === revision) store.set({ groups });
        }).catch(() => {});
      }
    } finally {
      if (memberWrites.get(p.id) === change) memberWrites.delete(p.id);
    }
  },
  async leaveGroup(p: Project) {
    if (!p.group) return;
    await api(`/groups/${p.group.code}/me`, { method: "DELETE" });
    await this.refresh(true);
  },
  // `{ rubric }`: the panel's own; `{ weights }`: back to the default criteria with these weights.
  async saveRubric(id: string, body: { rubric: Rubric } | { weights: number[] }) {
    return upsert(await api<Project>(`/projects/${id}/rubric`, json("PATCH", body)));
  },

  async remove(id: string) {
    await api<unknown>(`/projects/${id}`, { method: "DELETE" });
    const rest = store.get().projects.filter((p) => p.id !== id);
    store.set({ projects: rest });
    pickActive(rest);
  },
};

// Free tier: one manuscript (addendum Q1). Rejected uploads don't take the slot.
export const FREE_PROJECTS = 1;
export const countsTowardLimit = (p: Project) => p.status !== "failed";
