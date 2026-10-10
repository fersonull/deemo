import mammoth from "mammoth";

import { DOCX, Rejected, generateJson, type JPEG, type PDF, type PNG } from "./analysis";
import { CRITERIA, toFiveSteps } from "./scoring";

// Rubric upload (plan F3): the panel's own form, mapped onto DEEMO's five criteria. Nothing is stored;
// the student reviews the proposed weights before using them. The criteria stay fixed because the
// readiness formula is built on them; only the weights follow the panel's form.

const KEYS = CRITERIA.map((c) => c.key);

const SCHEMA = {
  type: "object",
  properties: {
    isRubric: { type: "boolean" },
    notRubricReason: { type: "string" },
    mappings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          theirs: { type: "string" },
          theirWeight: { type: "number" },
          ours: { type: "string", enum: [...KEYS, "none"] },
        },
        required: ["theirs", "theirWeight", "ours"],
      },
    },
  },
  required: ["isRubric", "notRubricReason", "mappings"],
};

const PROMPT = `A student uploaded this as the evaluation rubric or grading form their capstone defense panel uses.
First decide isRubric: true only for a defense / oral presentation evaluation rubric or scoring form. If false, set notRubricReason to one short sentence for the student (e.g. "This looks like a class schedule, not a defense rubric.") and return no mappings.
If true, list every scored criterion on the form in mappings:
- theirs: the criterion's name as written (short).
- theirWeight: its weight or maximum points as written; if the form gives no weights, use 1 for each.
- ours: the closest of these five, or "none" if it fits none of them:
${CRITERIA.map((c) => `  - ${c.key}: ${c.name} (${c.desc})`).join("\n")}
Delivery, presentation skills, poise, confidence and time management go to delivery. Answering questions well goes to content (knowledge) or reasoning (justification). Document quality, formatting and the written paper itself go to none: DEEMO only scores the oral defense.`;

export type RubricMapping = {
  weights: number[]; // CRITERIA order, 5% steps summing to 100
  mappings: { theirs: string; theirWeight: number; ours: string }[];
  uncovered: string[]; // our criteria the form doesn't weigh (set to 0%)
};

type Input = { bytes: Uint8Array; type: typeof PDF | typeof DOCX | typeof JPEG | typeof PNG };

export async function mapRubric({ bytes, type }: Input): Promise<RubricMapping> {
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
  const r = JSON.parse(text) as { isRubric: boolean; notRubricReason: string; mappings: RubricMapping["mappings"] };
  if (!r.isRubric) throw new Rejected(r.notRubricReason || "This doesn't look like a defense rubric.");
  const mapped = r.mappings.filter((m) => KEYS.includes(m.ours as (typeof KEYS)[number]));
  if (!mapped.length) throw new Rejected("None of this rubric's criteria match what DEEMO scores in an oral defense.");

  const raw = KEYS.map((k) => mapped.filter((m) => m.ours === k).reduce((a, m) => a + Math.max(0, m.theirWeight), 0));
  return {
    weights: toFiveSteps(raw),
    mappings: r.mappings.slice(0, 20),
    uncovered: CRITERIA.filter((_, i) => raw[i] === 0).map((c) => c.name),
  };
}
