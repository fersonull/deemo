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

// A level earns (level − 1) / 4: "Poor" (1) earns nothing, "Satisfactory" (3) half, "Excellent" (5) all.
// (The addendum's level / 5 banked 20% for a non-answer.)
export const levelPoints = (level: number) => (clamp(Math.round(level), 1, 5) - 1) / 4;

// RS = Σ(weight × points) × 100 over the criteria that could be measured. A null level (e.g. delivery in a
// typed-only session) drops out and the other weights are renormalized, instead of earning a free middle score.
export function rubricScore(levels: (number | null)[], weights: number[]) {
  const used = weights.map((w, i) => (levels[i] == null ? 0 : w));
  const total = sum(used) || 1;
  return sum(used.map((w, i) => (w / total) * levelPoints(levels[i] ?? 1))) * 100;
}

// CP = min(15, 5×HIGH + 2×MEDIUM + 0.5×LOW), verified contradictions only.
export function consistencyPenalty(severities: Severity[]) {
  const n = (s: Severity) => severities.filter((x) => x === s).length;
  return Math.min(15, 5 * n("HIGH") + 2 * n("MEDIUM") + 0.5 * n("LOW"));
}

// Readiness = clamp(RS × CF − CP, 0, 100), CF = answered / planned main questions, no floor: leaving after one
// question keeps a quarter of the score, not 60%. (The panel ending early itself doesn't count against the student;
// the caller passes planned = questions asked in that case.)
export function readiness(levels: (number | null)[], weights: number[], severities: Severity[], answered: number, planned: number) {
  const rs = rubricScore(levels, weights);
  const cf = planned > 0 ? clamp(answered / planned, 0, 1) : 0;
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
      level: null,
      why: "Not measured: no spoken answers.",
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

// Proposed weights → what the rubric screen can show: whole 5% steps, each 0–60, summing to 100
// (largest-remainder rounding). An all-zero proposal falls back to the default weights.
export function toFiveSteps(raw: number[], max = 60): number[] {
  const clean = raw.map((w) => (Number.isFinite(w) && w > 0 ? w : 0));
  const total = clean.reduce((a, b) => a + b, 0);
  if (total === 0) return [...DEFAULT_WEIGHTS];
  // Cap at max and hand the excess to the uncapped criteria in proportion, until nothing is over.
  let w = clean.map((x) => (x / total) * 100);
  for (let i = 0; i < w.length; i++) {
    const over = w.reduce((a, x) => a + Math.max(0, x - max), 0);
    if (over <= 1e-9) break;
    const room = w.reduce((a, x) => a + (x < max ? x : 0), 0);
    w = w.map((x) => (x >= max ? max : room > 0 ? x + (over * x) / room : x));
  }
  const steps = w.map((x) => x / 5);
  const floor = steps.map(Math.floor);
  let left = 20 - floor.reduce((a, b) => a + b, 0);
  const order = steps.map((s, i) => [s - Math.floor(s), i] as const).sort((a, b) => b[0] - a[0]);
  for (const [, i] of order) {
    if (left <= 0) break;
    if (floor[i]! * 5 < max) {
      floor[i]!++;
      left--;
    }
  }
  return floor.map((s) => s * 5);
}
