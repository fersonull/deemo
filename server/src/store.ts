import { mkdir } from "node:fs/promises";

// What the panel knows about a manuscript (Document Logic Analysis, plan F2). The raw file is never kept.
export type Analysis = {
  title: string;
  problem: string;
  objectives: string;
  method: string;
  scope: string;
  features: string;
  limits: string;
  results: string; // "" before the results chapter exists (Title / Pre-Oral)
  facts: string[]; // checkable claims for the consistency checker, e.g. "30 respondents (Ch. 3)"
  unsure: string[]; // fields the model couldn't find clearly
};

export type Project = {
  id: string;
  name: string;
  domain: string;
  fileName: string;
  sizeBytes: number;
  createdAt: string;
  status: "analyzing" | "ready" | "failed";
  error?: string;
  analysis?: Analysis;
  confirmedAt?: string; // the student reviewed the summary
};

const DIR = `${import.meta.dir}/../data`;
const FILE = `${DIR}/projects.json`;

let projects: Record<string, Project> | null = null;

// ponytail: one JSON file rewritten on every change and no per-user scoping; moves to the real
// database (and per-user projects) when Firebase sign-in lands.
async function load() {
  if (!projects) {
    const f = Bun.file(FILE);
    projects = (await f.exists()) ? ((await f.json()) as Record<string, Project>) : {};
    // An analysis can't survive a restart; don't leave the app polling forever.
    for (const p of Object.values(projects))
      if (p.status === "analyzing") Object.assign(p, { status: "failed", error: "The server restarted. Upload again." });
  }
  return projects;
}

async function save() {
  await mkdir(DIR, { recursive: true });
  await Bun.write(FILE, JSON.stringify(projects, null, 2));
}

export const store = {
  async list() {
    return Object.values(await load()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async get(id: string) {
    return (await load())[id] ?? null;
  },
  async put(p: Project) {
    (await load())[p.id] = p;
    await save();
    return p;
  },
};
