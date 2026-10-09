import { API_URL, type Domain } from "@/constants";
import { practiceSetup } from "@/hooks/use-practice-setup";
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

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `Request failed (${res.status})`);
  return body as T;
}

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

  // RN's FormData streams the file from its uri; the server reads it and keeps only the analysis.
  async upload(file: PickedFile, name: string, domain: Domain) {
    const form = new FormData();
    form.append("file", { uri: file.uri, name: file.name, type: file.mimeType ?? "application/octet-stream" } as unknown as Blob);
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
};
