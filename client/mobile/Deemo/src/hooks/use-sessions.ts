import { type Mode } from "@/constants";
import { practiceSetup } from "@/hooks/use-practice-setup";
import type { LiveState } from "@/live/types";
import { api } from "@/utils/api";
import { createStore } from "@/utils/store";

// Mirrors server/src/sessions.ts. Reports are scored on the server; the app submits and reads them.
type Severity = "LOW" | "MEDIUM" | "HIGH";

export type SessionTurn = {
  number: number;
  followUp: number;
  type: string;
  panelist: number;
  question: string;
  answer: string;
  latencyMs: number | null;
  answerMs: number;
};

export type Report = {
  scored?: boolean; // false: nothing was answered, so no score (missing on reports from before this field)
  score: number;
  band: string;
  message: string;
  rubricScore: number;
  penalty: number;
  answered: number;
  planned: number;
  criteria: { key: string; name: string; weight: number; level: number | null; why: string }[]; // null: not measured
  contradictions: { spokenClaim: string; manuscriptEvidence: string; severity: Severity; turn: number | null }[];
  turns: { feedback: string; betterAnswer: string }[];
  fixes: { text: string; turn: number | null }[];
  headline: string;
  delivery: { latencyS: number | null; fillersPerMin: number | null; wordsPerMin: number | null };
};

export type Session = {
  id: string;
  createdAt: string;
  updatedAt?: string; // a re-score restarts the wait from here
  status: "scoring" | "ready" | "failed";
  error?: string;
  title: string;
  mode: Mode;
  durationMs: number;
  turns: SessionTurn[];
  lines: { who: "you" | number; text: string; flagged?: boolean }[];
  report?: Report;
};

export type SessionSummary = Pick<Session, "id" | "createdAt" | "status" | "mode" | "title" | "durationMs"> & {
  score?: number;
  band?: string;
  tip?: string;
};

type Submit =
  | { state: "idle" }
  | { state: "saving" }
  | { state: "saved"; id: string }
  | { state: "failed"; error: string; payload: object };

const store = createStore({ list: [] as SessionSummary[], loaded: false, error: false, submit: { state: "idle" } as Submit });

export const useSessions = store.use;

const post = (body: object) => ({ method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

// What the server scores: the setup, the Q&A with timings, the transcript and the live flags. No audio.
function fromLive(s: LiveState, endedBy: "panel" | "student") {
  const { mode, domain, panelists, minutes, projectId, weights } = practiceSetup.get();
  const lines = s.partial?.text.trim() ? [...s.lines, s.partial] : s.lines;
  return {
    mode,
    domain,
    panelists,
    minutes,
    projectId: projectId ?? undefined,
    weights,
    durationMs: s.sessionMs,
    endedBy, // the panel closing early doesn't lower coverage; the student leaving does
    turns: s.turns.map((t) => ({
      number: t.question.number,
      followUp: t.question.followUp,
      type: t.question.type,
      panelist: t.question.panelist,
      question: t.question.text,
      answer: t.answer,
      latencyMs: t.latencyMs,
      answerMs: t.answerMs,
    })),
    lines,
    flags: s.flags,
  };
}

export const sessions = {
  reset() {
    store.set({ list: [], loaded: false, error: false, submit: { state: "idle" } });
  },

  // Fire and forget from the session screen; the scoring screen follows store.submit.
  async submit(payload: object) {
    store.set({ submit: { state: "saving" } });
    try {
      const saved = await api<Session>("/sessions", post(payload));
      store.set({ submit: { state: "saved", id: saved.id } });
    } catch (e) {
      store.set({ submit: { state: "failed", error: e instanceof Error ? e.message : "Couldn't save.", payload } });
    }
  },

  submitLive(s: LiveState, endedBy: "panel" | "student") {
    void this.submit(fromLive(s, endedBy));
  },

  retrySubmit() {
    const sub = store.get().submit;
    if (sub.state === "failed") void this.submit(sub.payload);
  },

  get: (id: string) => api<Session>(`/sessions/${id}`),

  rescore: (id: string) => api<Session>(`/sessions/${id}/score`, { method: "POST" }),

  async refresh() {
    try {
      store.set({ list: await api<SessionSummary[]>("/sessions"), loaded: true, error: false });
    } catch {
      store.set({ loaded: true, error: true });
    }
  },
};
