import mammoth from "mammoth";

import { DOCX, Rejected, generateJson, type JPEG, type PDF, type PNG } from "./analysis";
import { MAX_CRITERIA, toPercents, type Rubric } from "./scoring";

// Rubric upload (plan F3): the panel's own form becomes the rubric, criteria and all, replacing the five defaults.
// Nothing is stored here; the student reviews it on the rubric screen and saves it to the project.

const SCHEMA = {
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

const PROMPT = `A student uploaded this as the evaluation rubric or grading form their capstone defense panel uses.
First decide isRubric: true only for a defense / oral presentation evaluation rubric or scoring form. If false, set notRubricReason to one short sentence for the student (e.g. "This looks like a class schedule, not a defense rubric.") and return no criteria.
If true, list every scored criterion on the form, in the form's order (at most ${MAX_CRITERIA}; merge sub-items into their parent criterion if there are more):
- name: the criterion's name as written, short.
- desc: one sentence on what the panel looks for, from the form's own wording.
- points: its weight or maximum points as written; if the form gives none, use 1 for each.
- scorable: true if it can be judged from a recording of the student presenting and answering the panel's questions out loud (knowledge, reasoning, answering questions, clarity, organization, consistency with the paper, delivery, confidence, time management). false for anything that needs the written document itself (formatting, grammar, citations, the paper's quality) or watching the working system (a live demo, the system's functionality or design).
- level1, level3, level5: what a poor, a satisfactory and an excellent performance on it look like, one short sentence each. Use the form's descriptors when it has them; otherwise write them from the criterion's meaning.`;

type Input = { bytes: Uint8Array; type: typeof PDF | typeof DOCX | typeof JPEG | typeof PNG };
type Read = { name: string; desc: string; points: number; scorable: boolean; level1: string; level3: string; level5: string };

export async function buildRubric({ bytes, type }: Input, source: string): Promise<Rubric> {
  let doc;
  if (type === DOCX) {
    const text = await mammoth
      .extractRawText({ buffer: Buffer.from(bytes) })
      .then((r) => r.value)
      .catch(() => {
        throw new Rejected("This isn't a readable Word document. Try a PDF or a photo of the rubric.");
      });
    if (text.trim().length < 40) throw new Rejected("We couldn't find any text in this file. Try a PDF or a clear photo.");
    doc = { text };
  } else {
    doc = { inlineData: { mimeType: type, data: Buffer.from(bytes).toString("base64") } }; // PDF or photo, read as-is
  }

  const { text } = await generateJson({
    contents: [{ role: "user", parts: [doc, { text: PROMPT }] }],
    generationConfig: { responseMimeType: "application/json", responseJsonSchema: SCHEMA, temperature: 0 },
  });
  const r = JSON.parse(text) as { isRubric: boolean; notRubricReason: string; criteria: Read[] };
  if (!r.isRubric) throw new Rejected(r.notRubricReason || "This doesn't look like a defense rubric.");
  const read = r.criteria.filter((c) => c.name.trim()).slice(0, MAX_CRITERIA);
  if (!read.some((c) => c.scorable))
    throw new Rejected("None of this rubric's criteria can be judged in a practice defense. DEEMO scores the oral defense only.");

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
