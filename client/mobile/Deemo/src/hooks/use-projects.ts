import { File } from "expo-file-system";

import { type Domain } from "@/constants";
import { practiceSetup } from "@/hooks/use-practice-setup";
import { api } from "@/utils/api";
import { createStore } from "@/utils/store";

// Mirrors server/src/store.ts. The server keeps projects; the app only caches the list.
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
};

export type Project = {
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

const store = createStore({ projects: [] as Project[], loaded: false, error: false });

export const useProjects = store.use;

function upsert(p: Project) {
  const rest = store.get().projects.filter((x) => x.id !== p.id);
  store.set({ projects: [p, ...rest].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) });
  return p;
}

// The newest reviewed project is the one practice uses, unless the student picked another.
function pickActive(projects: Project[]) {
  const { projectId } = practiceSetup.get();
  if (projectId && projects.some((p) => p.id === projectId && p.analysis)) return;
  const latest = projects.find((p) => p.analysis && p.confirmedAt);
  practiceSetup.set(latest ? { projectId: latest.id, domain: latest.domain } : { projectId: null });
}

export const projects = {
  // Signed out: drop the last student's list and active manuscript.
  reset() {
    store.set({ projects: [], loaded: false, error: false });
    practiceSetup.set({ projectId: null });
  },

  async refresh() {
    try {
      const list = await api<Project[]>("/projects");
      store.set({ projects: list, loaded: true, error: false });
      pickActive(list);
    } catch {
      store.set({ loaded: true, error: true });
    }
  },

  async get(id: string) {
    return upsert(await api<Project>(`/projects/${id}`));
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

  async saveAnalysis(id: string, analysis: Partial<Analysis>, confirm = false) {
    const p = await api<Project>(`/projects/${id}/analysis`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ analysis, confirm }),
    });
    return upsert(p);
  },

  use(p: Project) {
    practiceSetup.set({ projectId: p.id, domain: p.domain });
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
