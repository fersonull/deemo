import mammoth from "mammoth";

import type { Analysis } from "./store";

// Document Logic Analysis (plan F2, addendum B3): a regular Flash model, before the session.
// Gemini models for analysis and scoring, best first; the next one takes over when one is rate-limited, over quota or
// unavailable. Flash first for accuracy, then Flash-Lite, which is rarely busy when Flash is (GitHub #2). Only distinct
// models: gemini-3.7-flash and gemini-3.5-flash now just route to 3.8 and 3.6 (ai.google.dev/gemini-api/docs/models,
// Oct 2026). Model names change often; check that page before changing this list.
export const FLASH_MODELS = [
  "models/gemini-3.8-flash",
  "models/gemini-3.6-flash",
  "models/gemini-3.5-flash-lite",
  "models/gemini-3.1-flash-lite", // shuts down 2027-05-07
];

export const MAX_BYTES = 20 * 1024 * 1024; // Gemini's inline request limit
export const PDF = "application/pdf";
export const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const FIELDS = ["title", "problem", "objectives", "method", "scope", "features", "limits", "results"] as const;

// A message the student sees as-is (the upload isn't usable), unlike an internal failure.
export class Rejected extends Error {}

// By content, not by name, so a renamed file can't slip through. Any zip passes here; mammoth rejects non-DOCX.
export function sniff(b: Uint8Array): typeof PDF | typeof DOCX | null {
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return PDF; // %PDF
  if (b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04) return DOCX; // PK zip
  return null;
}

export const JPEG = "image/jpeg";
export const PNG = "image/png";

// sniff, plus photos (rubrics are often a photo of a printed form).
export function sniffDocOrImage(b: Uint8Array): typeof PDF | typeof DOCX | typeof JPEG | typeof PNG | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return JPEG;
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return PNG;
  return sniff(b);
}

const SCHEMA = {
  type: "object",
  properties: {
    isManuscript: { type: "boolean" },
    notManuscriptReason: { type: "string" },
    ...Object.fromEntries(FIELDS.map((f) => [f, { type: "string" }])),
    facts: { type: "array", items: { type: "string" } },
    unsure: { type: "array", items: { type: "string", enum: [...FIELDS] } },
  },
  required: ["isManuscript", "notManuscriptReason", ...FIELDS, "facts", "unsure"],
};

const PROMPT = `A student uploaded this as their BSIT capstone manuscript. A mock defense panel will question them using only what you extract, and will flag spoken answers that contradict it.
First decide isManuscript: true for a capstone, thesis or research manuscript at any stage (title proposal, Chapters 1–3, or a full paper, even incomplete or rough). False for anything else: a resume, an assignment or quiz, slides or notes on an unrelated topic, a form, a story, a manual, or a file with almost no readable content. If false, set notManuscriptReason to one short sentence for the student saying what the file looks like instead (e.g. "This looks like a resume, not a research paper."), leave every other field empty and facts and unsure as empty lists. If true, set notManuscriptReason to "" and extract, in plain English:
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
  let doc;
  if (type === PDF) {
    doc = { inlineData: { mimeType: PDF, data: Buffer.from(bytes).toString("base64") } };
  } else {
    const text = await mammoth
      .extractRawText({ buffer: Buffer.from(bytes) })
      .then((r) => r.value)
      .catch(() => {
        throw new Rejected("This isn't a readable Word document. Save it as .docx or PDF and try again.");
      });
    // ponytail: a fixed floor; a real manuscript is tens of thousands of characters.
    if (text.trim().length < 500) throw new Rejected("We couldn't find enough text in this file. If it's scanned, upload it as a PDF.");
    doc = { text };
  }

  const { text, model } = await generateJson({
    contents: [{ role: "user", parts: [doc, { text: PROMPT }] }],
    generationConfig: { responseMimeType: "application/json", responseJsonSchema: SCHEMA, temperature: 0.2 },
  });
  const { isManuscript, notManuscriptReason, ...analysis } = JSON.parse(text) as Analysis & {
    isManuscript: boolean;
    notManuscriptReason: string;
  };
  if (!isManuscript) throw new Rejected(notManuscriptReason || "This doesn't look like a research manuscript.");
  return { ...analysis, model };
}

// Every Flash model in the chain was rate-limited, over quota or unavailable.
export class Busy extends Error {}

type Part = { text?: string; inlineData?: { mimeType: string; data: string } };
export type FlashRequest = {
  contents: { role: string; parts: Part[] }[];
  generationConfig: { responseJsonSchema?: object; thinkingConfig?: { thinkingLevel?: string } } & Record<string, unknown>;
};
type GeminiReply = { candidates?: { content?: { parts?: { text?: string }[] } }[] };

// Flash-Lite thinks at "minimal" unless told otherwise; Google suggests more thinking for accuracy, so a request that
// doesn't set a level gets "medium" there. Flash's own default is already medium.
export const forModel = (model: string, req: FlashRequest): FlashRequest =>
  model.includes("flash-lite") && !req.generationConfig.thinkingConfig?.thinkingLevel
    ? { ...req, generationConfig: { ...req.generationConfig, thinkingConfig: { thinkingLevel: "medium" } } }
    : req;

// One Flash call: the first model that answers wins, in FLASH_MODELS order. A rate limit, quota cap (each model has its
// own), overload, hang or retired model moves on to the next one; a bad key stops at once. A model that just timed out
// or said it's busy sits out for a few minutes, so the next request doesn't wait on it again. If every model is sitting
// out, all are tried anyway.
const COOLDOWN_MS = 5 * 60_000;
const coolingUntil = new Map<string, number>();

export async function generateJson(req: FlashRequest, { timeoutMs = 120_000 } = {}): Promise<{ text: string; model: string }> {
  let busy = false;
  let last = "";
  const now = Date.now();
  const ready = FLASH_MODELS.filter((m) => (coolingUntil.get(m) ?? 0) <= now);
  const coolDown = (m: string) => coolingUntil.set(m, Date.now() + COOLDOWN_MS);
  for (const model of ready.length ? ready : FLASH_MODELS) {
    const id = model.replace("models/", "");
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/${model}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": process.env.GEMINI_API_KEY ?? "", "content-type": "application/json" },
      body: JSON.stringify(forModel(model, req)),
      signal: AbortSignal.timeout(timeoutMs),
    }).catch((err: Error) => err);
    if (r instanceof Error) {
      // A hung or dropped request (seen under high demand) would otherwise block the upload or the report.
      last = `${id}: ${r.name === "TimeoutError" ? "timed out" : r.message}`;
      busy = true;
      coolDown(model);
      console.warn("flash fallback:", last);
      continue;
    }
    if (r.ok) {
      const json = (await r.json()) as GeminiReply;
      const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
      if (text) return { text, model: id };
      last = `${id}: empty response`;
      continue;
    }
    last = `${id} ${r.status}: ${(await r.text()).slice(0, 200)}`;
    if (r.status === 401 || r.status === 403) break; // the key is the problem; every other model would fail too
    if (r.status === 429 || r.status === 503) {
      busy = true;
      coolDown(model);
    }
    console.warn("flash fallback:", last);
  }
  throw busy ? new Busy(last) : new Error(last);
}
