import { ANALYSIS_MODEL } from "./analysis";
import { SAMPLE_MANUSCRIPT, manuscriptFacts, parseSetup, plannedMainQuestions, type Mode } from "./panel";
import { CRITERIA, DEFAULT_WEIGHTS, band, delivery, readiness, type Severity } from "./scoring";
import { collection, store } from "./store";

// A finished practice session and its report (plan F14, addendum Q3/Q4). Transcripts only; audio is never stored.

export type SessionTurn = {
  number: number; // main question number
  followUp: number; // 0 for a main question
  type: string;
  panelist: number;
  question: string;
  answer: string;
  latencyMs: number | null; // question end → speech start
  answerMs: number;
};

export type SessionLine = { who: "you" | number; text: string; flagged?: boolean };
export type LiveFlag = { spokenClaim: string; manuscriptEvidence: string; severity: Severity; atMs: number };

export type Report = {
  score: number;
  band: string;
  message: string;
  rubricScore: number;
  penalty: number;
  answered: number;
  planned: number;
  criteria: { key: string; name: string; weight: number; level: number; why: string }[];
  contradictions: { spokenClaim: string; manuscriptEvidence: string; severity: Severity; turn: number | null }[];
  turns: { feedback: string; betterAnswer: string }[]; // aligned with Session.turns
  fixes: { text: string; turn: number | null }[];
  headline: string;
  delivery: { latencyS: number | null; fillersPerMin: number | null; wordsPerMin: number | null };
};

export type Session = {
  id: string;
  createdAt: string;
  updatedAt?: string;
  status: "scoring" | "ready" | "failed";
  error?: string;
  projectId?: string;
  title: string; // the manuscript's title, or the sample paper
  mode: Mode;
  domain: string;
  minutes: number;
  panelists: number;
  durationMs: number;
  weights: number[];
  turns: SessionTurn[];
  lines: SessionLine[];
  flags: LiveFlag[];
  report?: Report;
};

export const sessions = collection<Session>("sessions");

const str = (x: unknown, max: number) => (typeof x === "string" ? x.slice(0, max) : "");
const num = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? x : 0);
const SEVERITIES: Severity[] = ["LOW", "MEDIUM", "HIGH"];

// The app's end-of-session payload, checked and trimmed (trust boundary).
export async function parseSession(uid: string, body: unknown): Promise<Omit<Session, "id" | "createdAt" | "status"> | null> {
  const b = (body ?? {}) as Record<string, unknown>;
  const setup = parseSetup(b);
  if (!setup || !Array.isArray(b.turns) || !Array.isArray(b.lines) || !Array.isArray(b.flags)) return null;
  const turns = (b.turns as Record<string, unknown>[]).slice(0, 60).map((t) => ({
    number: num(t.number),
    followUp: num(t.followUp),
    type: str(t.type, 20),
    panelist: num(t.panelist),
    question: str(t.question, 600),
    answer: str(t.answer, 4000),
    latencyMs: typeof t.latencyMs === "number" ? t.latencyMs : null,
    answerMs: num(t.answerMs),
  }));
  const lines = (b.lines as Record<string, unknown>[]).slice(0, 400).map((l) => ({
    who: l.who === "you" ? ("you" as const) : num(l.who),
    text: str(l.text, 4000),
    ...(l.flagged === true && { flagged: true }),
  }));
  const flags = (b.flags as Record<string, unknown>[]).slice(0, 40).map((f) => ({
    spokenClaim: str(f.spokenClaim, 400),
    manuscriptEvidence: str(f.manuscriptEvidence, 400),
    severity: SEVERITIES.includes(f.severity as Severity) ? (f.severity as Severity) : "LOW",
    atMs: num(f.atMs),
  }));
  const w = b.weights;
  const weights =
    Array.isArray(w) && w.length === 5 && w.every((x) => typeof x === "number" && x >= 0) && w.some((x) => x > 0)
      ? (w as number[])
      : DEFAULT_WEIGHTS;
  const project = setup.projectId ? await store.get(uid, setup.projectId) : null;
  return {
    projectId: project?.id,
    title: project?.analysis?.title || project?.name || "Sample paper (ReqTrack)",
    mode: setup.mode,
    domain: setup.domain,
    minutes: setup.minutes,
    panelists: setup.panelists,
    durationMs: num(b.durationMs),
    weights,
    turns,
    lines,
    flags,
  };
}

const JUDGED = CRITERIA.filter((c) => c.key !== "delivery"); // delivery is measured in code

const SCHEMA = {
  type: "object",
  properties: {
    criteria: {
      type: "array",
      items: {
        type: "object",
        properties: {
          key: { type: "string", enum: JUDGED.map((c) => c.key) },
          level: { type: "integer", minimum: 1, maximum: 5 },
          why: { type: "string" },
        },
        required: ["key", "level", "why"],
      },
    },
    contradictions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          keep: { type: "boolean" },
          spokenClaim: { type: "string" },
          manuscriptEvidence: { type: "string" },
          severity: { type: "string", enum: SEVERITIES },
          turn: { type: "integer" },
        },
        required: ["keep", "spokenClaim", "manuscriptEvidence", "severity", "turn"],
      },
    },
    turns: {
      type: "array",
      items: {
        type: "object",
        properties: { feedback: { type: "string" }, betterAnswer: { type: "string" } },
        required: ["feedback", "betterAnswer"],
      },
    },
    fixes: {
      type: "array",
      items: { type: "object", properties: { text: { type: "string" }, turn: { type: "integer" } }, required: ["text", "turn"] },
    },
    headline: { type: "string" },
  },
  required: ["criteria", "contradictions", "turns", "fixes", "headline"],
};

type Judgment = {
  criteria: { key: string; level: number; why: string }[];
  contradictions: { keep: boolean; spokenClaim: string; manuscriptEvidence: string; severity: Severity; turn: number }[];
  turns: { feedback: string; betterAnswer: string }[];
  fixes: { text: string; turn: number }[];
  headline: string;
};

function scoringPrompt(s: Omit<Session, "report">, facts: string) {
  const label = (t: SessionTurn) => `Q${t.number}${t.followUp ? ` follow-up ${t.followUp}` : ""}`;
  return `You are scoring a BSIT capstone mock defense (${s.mode.replace("_", "-")} defense). Judge only from the answers and the manuscript facts below. Address the student as "you". Never invent facts that aren't in the manuscript. In any text the student reads, refer to questions by their label (Q1, Q2 follow-up 1), never by the [index] in brackets; the indices are only for the turn fields.

RUBRIC (level 5 / 3 / 1):
${JUDGED.map((c) => `- ${c.key} (${c.name}): 5 = ${c.levels[2]}; 3 = ${c.levels[1]}; 1 = ${c.levels[0]}.`).join("\n")}

MANUSCRIPT FACTS
${facts}

QUESTIONS AND ANSWERS ([index] label: question → the student's answer)
${s.turns.map((t, i) => `[${i}] ${label(t)} (${t.type}): ${t.question}\n    Answer: ${t.answer.trim() || "(no answer)"}`).join("\n")}

CONTRADICTIONS FLAGGED DURING THE SESSION
${s.flags.length ? s.flags.map((f, i) => `[${i}] (${f.severity}) said: "${f.spokenClaim}" / manuscript: "${f.manuscriptEvidence}"`).join("\n") : "(none)"}

Return:
- criteria: one entry for each of ${JUDGED.map((c) => c.key).join(", ")}: an integer level 1–5 and one sentence of justification that points at a specific answer.
- contradictions: one entry per flagged contradiction above, in order. keep = true only if the student's words really contradict the manuscript facts (not a rounding, a synonym, or something the manuscript doesn't cover). spokenClaim: a short quote of what they said. manuscriptEvidence: the matching manuscript fact, quoted. turn: the answer's index, or -1. Then add any clear contradiction the session missed (keep = true).
- turns: one entry per answer above, in order. feedback: 1–2 specific sentences. betterAnswer: a stronger 2–4 sentence answer in the student's voice, using only the manuscript facts.
- fixes: the 3 most important, concrete things to work on, each with the answer index it comes from (or -1).
- headline: one honest, encouraging sentence for the top of the report, e.g. "Nice recovery on question 2. Next time, state your sample size first."`;
}

async function judge(prompt: string): Promise<Judgment> {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/${ANALYSIS_MODEL}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": process.env.GEMINI_API_KEY ?? "", "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", responseJsonSchema: SCHEMA, temperature: 0 }, // same answers, same levels
    }),
  });
  if (!r.ok) throw new Error(`scoring ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const json = (await r.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  return JSON.parse(json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "") as Judgment;
}

// Rubric levels and wording from Flash; delivery, verified contradictions and the score from code.
export async function scoreSession(uid: string, s: Omit<Session, "report">): Promise<Report> {
  const planned = plannedMainQuestions(s.minutes);
  const answered = new Set(s.turns.filter((t) => t.followUp === 0).map((t) => t.number)).size;
  const d = delivery(s.turns);

  let j: Judgment;
  if (s.turns.length === 0) {
    j = {
      criteria: JUDGED.map((c) => ({ key: c.key, level: 1, why: "No answers to judge yet." })),
      contradictions: [],
      turns: [],
      fixes: [{ text: "Stay for at least one full question so the panel has something to score.", turn: -1 }],
      headline: "The session ended before any questions were answered.",
    };
  } else {
    const project = s.projectId ? await store.get(uid, s.projectId) : null;
    j = await judge(scoringPrompt(s, project?.analysis ? manuscriptFacts(project.analysis) : SAMPLE_MANUSCRIPT));
  }

  const levelOf = (key: string) => Math.round(Math.min(5, Math.max(1, j.criteria.find((c) => c.key === key)?.level ?? 3)));
  const criteria = CRITERIA.map((c, i) => ({
    key: c.key,
    name: c.name,
    weight: s.weights[i] ?? 0,
    level: c.key === "delivery" ? d.level : levelOf(c.key),
    why: c.key === "delivery" ? d.why : (j.criteria.find((x) => x.key === c.key)?.why ?? ""),
  }));
  const turnIndex = (t: number) => (t >= 0 && t < s.turns.length ? t : null);
  const contradictions = j.contradictions
    .filter((c) => c.keep)
    .map(({ spokenClaim, manuscriptEvidence, severity, turn }) => ({
      spokenClaim,
      manuscriptEvidence,
      severity,
      turn: turnIndex(turn),
    }));
  const r = readiness(
    criteria.map((c) => c.level),
    s.weights,
    contradictions.map((c) => c.severity),
    answered,
    planned,
  );
  return {
    ...band(r.score),
    score: r.score,
    rubricScore: r.rubricScore,
    penalty: r.penalty,
    answered,
    planned,
    criteria,
    contradictions,
    turns: s.turns.map((_, i) => j.turns[i] ?? { feedback: "", betterAnswer: "" }),
    fixes: j.fixes.slice(0, 3).map((f) => ({ text: f.text, turn: turnIndex(f.turn) })),
    headline: j.headline,
    delivery: { latencyS: d.latencyS, fillersPerMin: d.fillersPerMin, wordsPerMin: d.wordsPerMin },
  };
}
