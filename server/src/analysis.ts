import mammoth from "mammoth";

import type { Analysis } from "./store";

// Document Logic Analysis (plan F2, addendum B3): a regular Flash model, before the session.
// Flash models for analysis and scoring, best first; the next one takes over when one is rate-limited, over quota
// or unavailable (addendum B3: model names change often, check the Models page before changing this list).
export const FLASH_MODELS = ["models/gemini-3.8-flash", "models/gemini-3.7-flash", "models/gemini-3.6-flash", "models/gemini-3.5-flash"];

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
export async function analyzeManuscript({ bytes, type }: Input, backup = false): Promise<Analysis> {
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

  const { text, model } = await generateJson(
    {
      contents: [{ role: "user", parts: [doc, { text: PROMPT }] }],
      generationConfig: { responseMimeType: "application/json", responseJsonSchema: SCHEMA, temperature: 0.2 },
    },
    { backup },
  );
  const { isManuscript, notManuscriptReason, ...analysis } = JSON.parse(text) as Analysis & {
    isManuscript: boolean;
    notManuscriptReason: string;
  };
  if (!isManuscript) throw new Rejected(notManuscriptReason || "This doesn't look like a research manuscript.");
  return { ...analysis, model };
}

// Every Flash model in the chain was rate-limited, over quota or unavailable.
export class Busy extends Error {}

// Backup when every Gemini model is down: OpenAI, only with OPENAI_API_KEY set and only for students who agreed to it
// (consent 2026-10.2 or later, see BACKUP_CONSENT). Luna is OpenAI's "high-volume" tier, Sol the stronger fallback
// (developers.openai.com/api/docs/models, Oct 2026). Model names change often: OPENAI_MODELS overrides the default.
// The live panel has no backup; it needs Gemini Live.
const OPENAI_MODELS = (process.env.OPENAI_MODELS ?? "gpt-6-luna,gpt-6.1-sol")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

type Part = { text?: string; inlineData?: { mimeType: string; data: string } };
export type FlashRequest = {
  contents: { role: string; parts: Part[] }[];
  generationConfig: { responseJsonSchema?: object; thinkingConfig?: { thinkingLevel?: string } } & Record<string, unknown>;
};

// The same request for OpenAI's Responses API: the same parts (PDFs as files, photos as images) and the same schema.
export function toOpenAI(model: string, req: FlashRequest) {
  const content = req.contents
    .flatMap((c) => c.parts)
    .map((p) =>
      p.inlineData?.mimeType === PDF
        ? { type: "input_file", filename: "document.pdf", file_data: `data:${PDF};base64,${p.inlineData.data}` }
        : p.inlineData
          ? { type: "input_image", image_url: `data:${p.inlineData.mimeType};base64,${p.inlineData.data}` }
          : { type: "input_text", text: p.text ?? "" },
    );
  const schema = req.generationConfig.responseJsonSchema;
  return {
    model,
    input: [{ role: "user", content }],
    text: { format: schema ? { type: "json_schema", name: "result", schema, strict: false } : { type: "json_object" } },
    ...(req.generationConfig.thinkingConfig?.thinkingLevel === "low" && { reasoning: { effort: "low" } }),
    store: false, // nothing kept on OpenAI's side beyond their abuse-monitoring window
  };
}

type Attempt = { provider: "gemini" | "openai"; id: string; url: string; headers: Record<string, string>; body: object };
type GeminiReply = { candidates?: { content?: { parts?: { text?: string }[] } }[] };
type OpenAIReply = { output?: { content?: { type: string; text?: string }[] }[] };

const replyText = (provider: Attempt["provider"], json: unknown) =>
  provider === "gemini"
    ? ((json as GeminiReply).candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "")
    : ((json as OpenAIReply).output ?? [])
        .flatMap((o) => o.content ?? [])
        .filter((c) => c.type === "output_text")
        .map((c) => c.text ?? "")
        .join("");

// One Flash call: the first model that answers wins, Gemini's in FLASH_MODELS order, then OpenAI's if allowed. A rate
// limit, quota cap (each model has its own), overload, hang or retired model moves on to the next one; a bad key skips
// the rest of that provider. A model that just timed out or said it's busy sits out for a few minutes, so the next
// request doesn't wait on it again. If every model is sitting out, all are tried anyway.
const COOLDOWN_MS = 5 * 60_000;
const coolingUntil = new Map<string, number>();

export async function generateJson(
  req: FlashRequest,
  { timeoutMs = 120_000, backup = false } = {},
): Promise<{ text: string; model: string }> {
  const attempts: Attempt[] = [
    ...FLASH_MODELS.map((model) => ({
      provider: "gemini" as const,
      id: model.replace("models/", ""),
      url: `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent`,
      headers: { "x-goog-api-key": process.env.GEMINI_API_KEY ?? "" },
      body: req,
    })),
    ...(backup && process.env.OPENAI_API_KEY
      ? OPENAI_MODELS.map((model) => ({
          provider: "openai" as const,
          id: `openai/${model}`,
          url: "https://api.openai.com/v1/responses",
          headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
          body: toOpenAI(model, req),
        }))
      : []),
  ];
  let busy = false;
  let last = "";
  const deadKey = new Set<Attempt["provider"]>();
  const now = Date.now();
  const ready = attempts.filter((a) => (coolingUntil.get(a.id) ?? 0) <= now);
  const coolDown = (id: string) => coolingUntil.set(id, Date.now() + COOLDOWN_MS);
  for (const a of ready.length ? ready : attempts) {
    if (deadKey.has(a.provider)) continue;
    const r = await fetch(a.url, {
      method: "POST",
      headers: { ...a.headers, "content-type": "application/json" },
      body: JSON.stringify(a.body),
      signal: AbortSignal.timeout(timeoutMs),
    }).catch((err: Error) => err);
    if (r instanceof Error) {
      // A hung or dropped request (seen under high demand) would otherwise block the upload or the report.
      last = `${a.id}: ${r.name === "TimeoutError" ? "timed out" : r.message}`;
      busy = true;
      coolDown(a.id);
      console.warn("flash fallback:", last);
      continue;
    }
    if (r.ok) {
      const text = replyText(a.provider, await r.json());
      if (text) return { text, model: a.id };
      last = `${a.id}: empty response`;
      continue;
    }
    last = `${a.id} ${r.status}: ${(await r.text()).slice(0, 200)}`;
    if (r.status === 401 || r.status === 403) deadKey.add(a.provider); // that key is the problem; its other models would fail too
    if (r.status === 429 || r.status === 503) {
      busy = true;
      coolDown(a.id);
    }
    console.warn("flash fallback:", last);
  }
  throw busy ? new Busy(last) : new Error(last);
}
