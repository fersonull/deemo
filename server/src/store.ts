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

// ponytail: one JSON file per collection, rewritten on every change, and no per-user scoping; moves to
// the real database (and per-user data) when Firebase sign-in lands.
export function collection<T extends { id: string; createdAt: string; status: string; error?: string }>(name: string) {
  const file = `${DIR}/${name}.json`;
  let items: Record<string, T> | null = null;

  async function load() {
    if (!items) {
      const f = Bun.file(file);
      items = (await f.exists()) ? ((await f.json()) as Record<string, T>) : {};
      // Background work can't survive a restart; don't leave the app polling forever.
      for (const it of Object.values(items))
        if (it.status === "analyzing" || it.status === "scoring")
          Object.assign(it, { status: "failed", error: "The server restarted. Try again." });
    }
    return items;
  }

  async function save() {
    await mkdir(DIR, { recursive: true });
    await Bun.write(file, JSON.stringify(items, null, 2));
  }

  return {
    async list() {
      return Object.values(await load()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async get(id: string) {
      return (await load())[id] ?? null;
    },
    async put(it: T) {
      (await load())[it.id] = it;
      await save();
      return it;
    },
    async remove(id: string) {
      delete (await load())[id];
      await save();
    },
  };
}

export const store = collection<Project>("projects");
