import mammoth from "mammoth";

import type { Analysis } from "./store";

// Document Logic Analysis (plan F2, addendum B3): a regular Flash model, before the session.
export const ANALYSIS_MODEL = "models/gemini-3.8-flash"; // check the Models page before changing

export const MAX_BYTES = 20 * 1024 * 1024; // Gemini's inline request limit
export const PDF = "application/pdf";
export const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const FIELDS = ["title", "problem", "objectives", "method", "scope", "features", "limits", "results"] as const;

const SCHEMA = {
  type: "object",
  properties: {
    ...Object.fromEntries(FIELDS.map((f) => [f, { type: "string" }])),
    facts: { type: "array", items: { type: "string" } },
    unsure: { type: "array", items: { type: "string", enum: [...FIELDS] } },
  },
  required: [...FIELDS, "facts", "unsure"],
};

const PROMPT = `This is a BSIT capstone manuscript. A mock defense panel will question the student using only what you extract, and will flag spoken answers that contradict it. Extract, in plain English:
- title: the exact title.
- problem: the problem the study addresses and for whom (1–2 sentences).
- objectives: the general and specific objectives, condensed (1–3 sentences).
- method: research design, development methodology, respondents/sample (number and who), sampling technique, instruments and statistical treatment.
- scope: who and what the system covers, where and when.
- features: the system's main features.
- limits: the stated limitations.
- results: the main findings and evaluation results with their numbers; "" if the manuscript has no results yet.
- facts: 10 to 25 short, checkable facts a panel could catch a student contradicting: counts, sample sizes, tools and technologies, scales, scores, dates, names. Copy numbers exactly, and end each with where it appears, e.g. "Thirty (30) respondents: 20 students, 7 staff, 3 IT experts (Ch. 3)".
Use the manuscript's own numbers and names. Never invent or assume anything. If a field isn't stated clearly, give your best short reading of what is there (or "" if nothing) and list the field in unsure.`;

type Input = { bytes: Uint8Array; type: string };

// The file only lives in this call: a PDF goes to Gemini as-is (it reads scanned pages too), a DOCX as its text.
export async function analyzeManuscript({ bytes, type }: Input): Promise<Analysis> {
  const doc =
    type === PDF
      ? { inlineData: { mimeType: PDF, data: Buffer.from(bytes).toString("base64") } }
      : { text: (await mammoth.extractRawText({ buffer: Buffer.from(bytes) })).value };

  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/${ANALYSIS_MODEL}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": process.env.GEMINI_API_KEY ?? "", "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [doc, { text: PROMPT }] }],
      generationConfig: { responseMimeType: "application/json", responseJsonSchema: SCHEMA, temperature: 0.2 },
    }),
  });
  if (!r.ok) throw new Error(`analysis ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const json = (await r.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  return JSON.parse(text) as Analysis;
}
