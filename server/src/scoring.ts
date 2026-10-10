// Readiness scoring (addendum Q4/Q5). The LLM only supplies rubric levels and justifications;
// every number the student sees is computed here, so each point can be explained.

export type Severity = "LOW" | "MEDIUM" | "HIGH";

export const CRITERIA = [
  {
    key: "content",
    name: "Content Mastery",
    desc: "Knows the study inside out",
    levels: ["Incorrect or unable to explain", "Mostly correct, some gaps", "Accurate, complete, uses correct technical terms"],
  },
  {
    key: "reasoning",
    name: "Reasoning & Justification",
    desc: "Justifies the choices made",
    levels: [
      "States choices without justification",
      "Gives reasons but shallow",
      "Clearly justifies design/method choices with reasons and alternatives",
    ],
  },
  {
    key: "clarity",
    name: "Clarity & Organization",
    desc: "Answers in a clear order",
    levels: ["Disorganized, off-topic", "Understandable but wandering", "Direct answer first, logical structure, concise"],
  },
  {
    key: "consistency",
    name: "Consistency with Manuscript",
    desc: "Matches the manuscript",
    levels: ["Major contradictions", "Minor discrepancies", "No contradictions with the paper"],
  },
  {
    key: "delivery",
    name: "Confidence & Delivery",
    desc: "Prompt start, steady pace, few fillers",
    levels: [
      "Long pauses, frequent fillers, incomplete answers",
      "Some hesitation and fillers",
      "Prompt start, steady pace, few fillers",
    ],
  },
] as const;

export const DEFAULT_WEIGHTS = [25, 20, 20, 20, 15];

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

// RS = Σ(weight × level / 5) × 100, weights normalized to 1.
export function rubricScore(levels: number[], weights: number[]) {
  const total = sum(weights) || 1;
  return sum(weights.map((w, i) => (w / total) * ((levels[i] ?? 1) / 5))) * 100;
}

// CP = min(15, 5×HIGH + 2×MEDIUM + 0.5×LOW), verified contradictions only.
export function consistencyPenalty(severities: Severity[]) {
  const n = (s: Severity) => severities.filter((x) => x === s).length;
  return Math.min(15, 5 * n("HIGH") + 2 * n("MEDIUM") + 0.5 * n("LOW"));
}

// Readiness = clamp(RS × CF − CP, 0, 100), CF = answered / planned main questions, floor 0.6.
export function readiness(levels: number[], weights: number[], severities: Severity[], answered: number, planned: number) {
  const rs = rubricScore(levels, weights);
  const cf = clamp(planned > 0 ? answered / planned : 1, 0.6, 1);
  const cp = consistencyPenalty(severities);
  return { score: Math.round(clamp(rs * cf - cp, 0, 100)), rubricScore: Math.round(rs), penalty: cp, coverage: cf };
}

export function band(score: number) {
  if (score >= 85) return { band: "Defense-ready", message: "Polish delivery" };
  if (score >= 70) return { band: "Nearly ready", message: "Fix weak criteria" };
  if (score >= 50) return { band: "Developing", message: "Practice flagged topics" };
  return { band: "Needs preparation", message: "Review your manuscript before retrying" };
}

// Confidence & Delivery from observable proxies only (no emotion recognition, addendum Q5).
// ponytail: thresholds are the addendum's starting points; calibrate in the 3–5 student pilot.
const FILLERS = /\b(u+m+|u+h+m*|a+h+|e+r+m*|hmm+|parang|ano)\b/gi;

const latencyLevel = (s: number) => (s <= 3 ? 5 : s <= 5 ? 4 : s <= 8 ? 3 : s <= 12 ? 2 : 1);
const fillerLevel = (perMin: number) => (perMin <= 3 ? 5 : perMin <= 5 ? 4 : perMin <= 8 ? 3 : perMin <= 12 ? 2 : 1);
const rateLevel = (wpm: number) =>
  wpm >= 110 && wpm <= 160 ? 5 : wpm >= 95 && wpm <= 180 ? 4 : wpm >= 80 && wpm <= 200 ? 3 : wpm >= 60 && wpm <= 220 ? 2 : 1;

type SpokenTurn = { answer: string; latencyMs: number | null; answerMs: number };

export function delivery(turns: SpokenTurn[]) {
  // Spoken answers only: a typed answer has no speech onset and no speaking time.
  const spoken = turns.filter((t) => t.latencyMs !== null && t.answerMs >= 1000 && t.answer.trim());
  if (spoken.length === 0) {
    return {
      latencyS: null,
      fillersPerMin: null,
      wordsPerMin: null,
      level: 3,
      why: "Not enough spoken answers to measure delivery.",
    };
  }
  const minutes = sum(spoken.map((t) => t.answerMs)) / 60000;
  const words = sum(spoken.map((t) => t.answer.trim().split(/\s+/).length));
  const fillers = sum(spoken.map((t) => t.answer.match(FILLERS)?.length ?? 0));
  const latencyS = sum(spoken.map((t) => t.latencyMs ?? 0)) / spoken.length / 1000;
  const fillersPerMin = fillers / minutes;
  const wordsPerMin = words / minutes;
  const level = Math.round((latencyLevel(latencyS) + fillerLevel(fillersPerMin) + rateLevel(wordsPerMin)) / 3);
  const r1 = (x: number) => Math.round(x * 10) / 10;
  return {
    latencyS: r1(latencyS),
    fillersPerMin: r1(fillersPerMin),
    wordsPerMin: Math.round(wordsPerMin),
    level,
    why: `Started answers in ${r1(latencyS)} s on average, ${r1(fillersPerMin)} fillers a minute, ${Math.round(wordsPerMin)} words a minute.`,
  };
}
