import { z } from "zod";

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
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

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

// A rubric coming back from the app to be saved (trust boundary): text trimmed and capped, the weights must add up.
const WEIGHTS_MESSAGE = "Each scored criterion needs a weight, totaling 100%.";
const text = (max: number) => z.unknown().optional().transform((v) => (typeof v === "string" ? v.trim().slice(0, max) : ""));
const RubricCriterionInput = z
  .object({
    name: text(80),
    desc: text(300),
    points: z.unknown().optional().transform((p) => (typeof p === "number" && p >= 0 && p <= 1000 ? p : 0)),
    weight: z.number({ error: WEIGHTS_MESSAGE }).int(WEIGHTS_MESSAGE).min(0, WEIGHTS_MESSAGE).max(100, WEIGHTS_MESSAGE),
    scored: z.unknown().optional().transform((s) => s === true),
    levels: z
      .array(z.unknown())
      .transform((ls) => ls.slice(0, 3).map((l) => (typeof l === "string" ? l.trim().slice(0, 200) : "")) as [string, string, string]),
  })
  .refine((c) => c.name && c.levels.length === 3 && c.levels.every(Boolean), "Each criterion needs a name and three level descriptions.")
  .refine((c) => c.scored || c.weight === 0, WEIGHTS_MESSAGE);

export const RubricInput = z
  .object({
    source: text(200),
    criteria: z.array(RubricCriterionInput).min(1, "Add at least one criterion.").max(MAX_CRITERIA, `At most ${MAX_CRITERIA} criteria.`),
  })
  .refine((r) => sum(r.criteria.filter((c) => c.scored).map((c) => c.weight)) === 100, WEIGHTS_MESSAGE);

// What Gemini is asked for and must return when reading a rubric form.
export const RUBRIC_SCHEMA = {
  type: "object",
  properties: {
    isRubric: { type: "boolean" },
    notRubricReason: { type: "string" },
    criteria: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          desc: { type: "string" },
          points: { type: "number" },
          scorable: { type: "boolean" },
          level1: { type: "string" },
          level3: { type: "string" },
          level5: { type: "string" },
        },
        required: ["name", "desc", "points", "scorable", "level1", "level3", "level5"],
      },
    },
  },
  required: ["isRubric", "notRubricReason", "criteria"],
};

export const RubricReply = z.object({
  isRubric: z.boolean(),
  notRubricReason: z.string(),
  criteria: z.array(
    z.object({
      name: z.string(),
      desc: z.string(),
      points: z.number(),
      scorable: z.boolean(),
      level1: z.string(),
      level3: z.string(),
      level5: z.string(),
    }),
  ),
});

export const RUBRIC_PROMPT = `A student uploaded this as the evaluation rubric or grading form their capstone defense panel uses.
First decide isRubric: true only for a defense / oral presentation evaluation rubric or scoring form. If false, set notRubricReason to one short sentence for the student (e.g. "This looks like a class schedule, not a defense rubric.") and return no criteria.
If true, list every scored criterion on the form, in the form's order (at most ${MAX_CRITERIA}; merge sub-items into their parent criterion if there are more):
- name: the criterion's name as written, short.
- desc: one sentence on what the panel looks for, from the form's own wording.
- points: its weight or maximum points as written; if the form gives none, use 1 for each.
- scorable: true if it can be judged from a recording of the student presenting and answering the panel's questions out loud (knowledge, reasoning, answering questions, clarity, organization, consistency with the paper, delivery, confidence, time management). false for anything that needs the written document itself (formatting, grammar, citations, the paper's quality) or watching the working system (a live demo, the system's functionality or design).
- level1, level3, level5: what a poor, a satisfactory and an excellent performance on it look like, one short sentence each. Use the form's descriptors when it has them; otherwise write them from the criterion's meaning.`;

// The form as Gemini read it → a whole rubric: scored criteria's points become whole percents.
export function rubricFromReply(reply: z.output<typeof RubricReply>, source: string): Rubric {
  const read = reply.criteria.filter((c) => c.name.trim()).slice(0, MAX_CRITERIA);
  const scored = read.filter((c) => c.scorable);
  const weights = toPercents(scored.map((c) => c.points));
  const cut = (s: string, max: number) => s.trim().slice(0, max);
  return {
    source: cut(source, 200),
    criteria: read.map((c) => ({
      name: cut(c.name, 80),
      desc: cut(c.desc, 300),
      points: Number.isFinite(c.points) && c.points >= 0 ? Math.min(c.points, 1000) : 0,
      weight: c.scorable ? weights[scored.indexOf(c)]! : 0,
      scored: c.scorable,
      levels: [cut(c.level1, 200), cut(c.level3, 200), cut(c.level5, 200)].map((l) => l || "—") as [string, string, string],
    })),
  };
}
