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

// A panel's own rubric (plan F3, rubric upload): it replaces the five default criteria entirely. Criteria DEEMO can't
// judge from a spoken defense (the written paper, a live system demo) stay listed with scored = false and weight 0.
export type RubricCriterion = {
  name: string;
  desc: string; // what the panel looks for
  points: number; // as written on the form (display only)
  weight: number; // whole percent of the score; the scored criteria total 100
  scored: boolean;
  levels: [string, string, string]; // what a 1, a 3 and a 5 look like
};
export type Rubric = { source: string; criteria: RubricCriterion[] };

export const MAX_CRITERIA = 12;

// Points → whole percents summing to 100 (largest remainder). All zero → equal shares.
export function toPercents(raw: number[]): number[] {
  const clean = raw.map((w) => (Number.isFinite(w) && w > 0 ? w : 0));
  const total = sum(clean);
  const share = total ? clean.map((w) => (w / total) * 100) : clean.map(() => 100 / clean.length);
  const out = share.map(Math.floor);
  const order = share.map((x, i) => [x - Math.floor(x), i] as const).sort((a, b) => b[0] - a[0]);
  for (let k = 0, left = 100 - sum(out); k < left; k++) out[order[k]![1]]!++;
  return out;
}

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// A rubric coming back from the app to be saved (trust boundary): trimmed, capped, and the weights must add up.
export function parseRubric(x: unknown): Rubric | null {
  const r = (x ?? {}) as Record<string, unknown>;
  if (!Array.isArray(r.criteria) || r.criteria.length < 1 || r.criteria.length > MAX_CRITERIA) return null;
  const criteria = (r.criteria as Record<string, unknown>[]).map((c) => ({
    name: text(c?.name, 80),
    desc: text(c?.desc, 300),
    points: typeof c?.points === "number" && c.points >= 0 && c.points <= 1000 ? c.points : 0,
    weight: c?.weight as number,
    scored: c?.scored === true,
    levels: (Array.isArray(c?.levels) ? c.levels : []).slice(0, 3).map((l) => text(l, 200)) as [string, string, string],
  }));
  if (criteria.some((c) => !c.name || c.levels.length !== 3 || c.levels.some((l) => !l))) return null;
  if (criteria.some((c) => !Number.isInteger(c.weight) || c.weight < 0 || c.weight > 100 || (!c.scored && c.weight !== 0))) return null;
  if (sum(criteria.filter((c) => c.scored).map((c) => c.weight)) !== 100) return null;
  return { source: text(r.source, 200), criteria };
}
