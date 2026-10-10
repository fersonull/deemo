import { db } from "./firebase";

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
  updatedAt?: string;
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

// Background jobs (analysis, scoring) that stopped updating, e.g. the server restarted mid-job.
const STALE_MS = 5 * 60_000;

type Item = { id: string; createdAt: string; updatedAt?: string; status: string; error?: string };

// One Firestore subcollection per user: users/{uid}/{name}/{id}. Only the server reads and writes it.
export function collection<T extends Item>(name: string) {
  const col = (uid: string) => db.collection("users").doc(uid).collection(name);
  const fresh = (it: T): T =>
    (it.status === "analyzing" || it.status === "scoring") && Date.now() - Date.parse(it.updatedAt ?? it.createdAt) > STALE_MS
      ? { ...it, status: "failed", error: "This took too long. Try again." }
      : it;

  return {
    async list(uid: string) {
      const snap = await col(uid).orderBy("createdAt", "desc").get();
      return snap.docs.map((d) => fresh(d.data() as T));
    },
    async get(uid: string, id: string) {
      const d = await col(uid).doc(id).get();
      return d.exists ? fresh(d.data() as T) : null;
    },
    async put(uid: string, it: T) {
      const next = { ...it, updatedAt: new Date().toISOString() };
      await col(uid).doc(it.id).set(next);
      return next;
    },
    async remove(uid: string, id: string) {
      await col(uid).doc(id).delete();
    },
  };
}

export const store = collection<Project>("projects");

// The account record (plan §13): consent and the simulated tier (addendum Q1). Set only by the server.
export type UserRecord = { premium: boolean; allowTyping: boolean; consentAt?: string; consentVersion?: string };

export const users = {
  async get(uid: string): Promise<UserRecord> {
    const d = await db.collection("users").doc(uid).get();
    return { premium: false, allowTyping: true, ...(d.data() as Partial<UserRecord> | undefined) };
  },
  async update(uid: string, patch: Partial<UserRecord>) {
    await db.collection("users").doc(uid).set(patch, { merge: true });
  },
  // Everything under users/{uid}: the record, projects and sessions (addendum Q9 "Delete my data").
  async removeAll(uid: string) {
    await db.recursiveDelete(db.collection("users").doc(uid));
  },
};
