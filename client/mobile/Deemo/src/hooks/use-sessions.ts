import { type Difficulty, type Mode } from "@/constants";
import { practiceSetup } from "@/hooks/use-practice-setup";
import type { LiveState } from "@/live/types";
import { api } from "@/utils/api";
import { freshFor } from "@/utils/fresh";
import { createStore } from "@/utils/store";

// Mirrors server/src/modules/scoring/domain/session.ts. Reports are scored on the server; the app submits and reads them.
type Severity = "LOW" | "MEDIUM" | "HIGH";

export type SessionTurn = {
  number: number;
  followUp: number;
  type: string;
  panelist: number;
  question: string;
  topic?: string; // the agenda item it was about
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
  difficulty?: Difficulty; // missing on sessions from before the setting
  groupCode?: string; // practiced on a group project
  weakFrom?: string; // a "Practice weak topics" round on that session
  projectId?: string;
  domain: string;
  panelists: number;
  minutes: number; // the safety cap it ran under
  agenda?: { id: string; label: string }[]; // the topics the panel had to cover (missing on older sessions)
  followUps: number;
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
// The live state counts panelists by seat; a saved session stores persona indices, so its transcript keeps the right
// names whatever the course is later.
function fromLive(s: LiveState, endedBy: "panel" | "student" | "time", seats: number[]) {
  const persona = (seat: number) => seats[seat] ?? seat;
  const { mode, domain, panelists, followUps, difficulty, projectId, weights, weakFrom } = practiceSetup.get();
  const lines = (s.partial?.text.trim() ? [...s.lines, s.partial] : s.lines).map((l) =>
    l.who === "you" ? l : { ...l, who: persona(l.who) },
  );
  return {
    mode,
    domain,
    panelists,
    followUps,
    difficulty,
    projectId: projectId ?? undefined,
    weakFrom: weakFrom ?? undefined,
    weights,
    durationMs: s.sessionMs,
    endedBy,
    turns: s.turns.map((t) => ({
      number: t.question.number,
      followUp: t.question.followUp,
      type: t.question.type,
      panelist: persona(t.question.panelist),
      question: t.question.text,
      topic: t.question.topicId,
      answer: t.answer,
      latencyMs: t.latencyMs,
      answerMs: t.answerMs,
    })),
    lines,
    flags: s.flags,
  };
}

// Opening a screen reuses a list loaded in the last minute, unless a session is still being scored.
const fresh = freshFor(60_000);

export const sessions = {
  reset() {
    fresh.invalidate();
    store.set({ list: [], loaded: false, error: false, submit: { state: "idle" } });
  },

  // Fire and forget from the session screen; the scoring screen follows store.submit.
  async submit(payload: object) {
    store.set({ submit: { state: "saving" } });
    try {
      const saved = await api<Session>("/sessions", post(payload));
      fresh.invalidate(); // a new session for History and Home
      store.set({ submit: { state: "saved", id: saved.id } });
    } catch (e) {
      store.set({ submit: { state: "failed", error: e instanceof Error ? e.message : "Couldn't save.", payload } });
    }
  },

  submitLive(s: LiveState, endedBy: "panel" | "student" | "time", seats: number[]) {
    void this.submit(fromLive(s, endedBy, seats));
  },

  retrySubmit() {
    const sub = store.get().submit;
    if (sub.state === "failed") void this.submit(sub.payload);
  },

  get: (id: string) => api<Session>(`/sessions/${id}`),

  rescore(id: string) {
    fresh.invalidate(); // its status changes
    return api<Session>(`/sessions/${id}/score`, { method: "POST" });
  },

  // `force`: pull to refresh.
  refresh(force = false) {
    const pending = store.get().list.some((s) => s.status === "scoring");
    return fresh.run(async () => {
      try {
        store.set({ list: await api<SessionSummary[]>("/sessions"), loaded: true, error: false });
        return true;
      } catch {
        store.set({ loaded: true, error: true });
        return false;
      }
    }, force || pending);
  },
};
