import { z } from "zod";

import { COURSES, type Course } from "../../identity/domain/course";
import type { Rubric } from "./rubric";

// A student's manuscript project and its Document Logic Analysis (plan F2). The raw file is never kept.

// The study's IT field, picked per project by computing students (identity/domain/course.ts COMPUTING); every other
// course uses "General" and is profiled by the course alone.
export const DOMAINS = ["Web/Mobile App", "Networking & Security", "Data & AI", "IoT/Hardware", "Information Systems", "General"] as const;
export type Domain = (typeof DOMAINS)[number];

export const FIELDS = ["title", "problem", "objectives", "method", "scope", "features", "limits", "results"] as const;

export type Analysis = {
  title: string;
  problem: string;
  objectives: string;
  method: string;
  scope: string;
  features: string;
  limits: string;
  results: string; // "" before the results chapter exists (Title / Pre-Oral)
  facts: string[]; // checkable claims for the consistency checker, e.g. "30 respondents (Ch. 3)"
  unsure: string[]; // fields the model couldn't find clearly ("field" included)
  field?: Course; // the study's field, detected from its content (none on older analyses): the panel follows it
  model?: string; // which Flash model read it
};

export type ProjectStatus = "analyzing" | "ready" | "failed";

export type Project = {
  id: string;
  name: string;
  domain: string;
  fileName: string;
  sizeBytes: number;
  createdAt: string;
  updatedAt?: string;
  status: ProjectStatus;
  error?: string;
  analysis?: Analysis;
  confirmedAt?: string; // the student reviewed the summary
  weights?: number[]; // the default rubric's weights
  rubric?: Rubric; // the panel's own rubric, replacing the default (plan F3)
};

// Background jobs that stopped updating (the server restarted mid-job) read as failed after five minutes.
export const STALE_MS = 5 * 60_000;
export const STALE_ERROR = "This took too long. Try again.";

// A message the student sees as-is (the upload isn't usable), unlike an internal failure.
export class Rejected extends Error {}

// Uploads
export const PDF = "application/pdf";
export const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
// Gemini takes PDFs up to 50 MB (sent inline: 50 MB is ~67 MB as base64, under its 100 MB request limit). A DOCX goes as
// its text plus capped images (infrastructure/docx.ts), so it can be bigger; the app checks the same limits.
export const MAX_BYTES = { [PDF]: 50 * 1024 * 1024, [DOCX]: 100 * 1024 * 1024 } as const;
export const MAX_UPLOAD = MAX_BYTES[DOCX];
export const JPEG = "image/jpeg";
export const PNG = "image/png";
export type DocType = typeof PDF | typeof DOCX;
export type DocOrImageType = DocType | typeof JPEG | typeof PNG;

// By content, not by name, so a renamed file can't slip through. Any zip passes here; mammoth rejects non-DOCX.
export function sniff(b: Uint8Array): DocType | null {
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return PDF; // %PDF
  if (b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04) return DOCX; // PK zip
  return null;
}

// sniff, plus photos (rubrics are often a photo of a printed form).
export function sniffDocOrImage(b: Uint8Array): DocOrImageType | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return JPEG;
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return PNG;
  return sniff(b);
}

export type AnalysisEdits = Partial<Record<(typeof FIELDS)[number], string>> & { facts?: string[]; field?: Course };

// The student's corrections to the summary: they vouched for an edited field, so it's no longer "unsure".
export function applyEdits(a: Analysis, edits: AnalysisEdits): Analysis {
  const next: Analysis = { ...a };
  if (edits.field && (COURSES as readonly string[]).includes(edits.field)) {
    next.field = edits.field;
    next.unsure = next.unsure.filter((u) => u !== "field");
  }
  for (const f of FIELDS) {
    if (edits[f] === undefined) continue;
    next[f] = edits[f]!.slice(0, 2000);
    next.unsure = next.unsure.filter((u) => u !== f);
  }
  if (edits.facts) next.facts = edits.facts.map((x) => x.trim().slice(0, 300)).filter(Boolean).slice(0, 40);
  return next;
}

// What Gemini is asked for and must return when reading a manuscript.
export const ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    isManuscript: { type: "boolean" },
    notManuscriptReason: { type: "string" },
    ...Object.fromEntries(FIELDS.map((f) => [f, { type: "string" }])),
    facts: { type: "array", items: { type: "string" } },
    field: { type: "string", enum: [...COURSES] },
    itField: { type: "string", enum: [...DOMAINS] },
    unsure: { type: "array", items: { type: "string", enum: [...FIELDS, "field"] } },
  },
  required: ["isManuscript", "notManuscriptReason", ...FIELDS, "facts", "field", "itField", "unsure"],
};

const field = z.string().transform((s) => s.slice(0, 2000));
export const AnalysisReply = z.object({
  isManuscript: z.boolean(),
  notManuscriptReason: z.string(),
  ...(Object.fromEntries(FIELDS.map((f) => [f, field])) as Record<(typeof FIELDS)[number], typeof field>),
  facts: z.array(z.string()).transform((xs) => xs.map((x) => x.slice(0, 300)).slice(0, 40)),
  field: z.enum(COURSES).catch("Other"),
  itField: z.enum(DOMAINS).catch("General"),
  unsure: z.array(z.enum([...FIELDS, "field"])),
});

export const ANALYSIS_PROMPT = `A student uploaded this as their research manuscript (a capstone, thesis or research paper from any program). A mock defense panel will question them using only what you extract, and will flag spoken answers that contradict it.
First decide isManuscript: true for a capstone, thesis or research manuscript at any stage (title proposal, Chapters 1–3, or a full paper, even incomplete or rough). False for anything else: a resume, an assignment or quiz, slides or notes on an unrelated topic, a form, a story, a manual, or a file with almost no readable content. If false, set notManuscriptReason to one short sentence for the student saying what the file looks like instead (e.g. "This looks like a resume, not a research paper."), leave every other field empty and facts and unsure as empty lists. If true, set notManuscriptReason to "" and extract, in plain English:
- title: the exact title.
- problem: the problem the study addresses and for whom (1–2 sentences).
- objectives: the general and specific objectives, condensed (1–3 sentences).
- method: research design, development methodology, respondents/sample (number and who), sampling technique, instruments and statistical treatment.
- scope: who and what the system covers, where and when.
- features: the system's main features; if the study builds no system, its main output or intervention (a module, program, framework, product); "" if it has none.
- limits: the stated limitations.
- results: the main findings and evaluation results with their numbers; "" if the manuscript has no results yet.
- field: the academic program this study belongs to, judged from its content (what was built or studied, its methods and setting), not from the school or the student. The closest of: ${COURSES.join(", ")}. Use Other if none fits; list field in unsure if it's unclear.
- itField: for a computing study (BSIT or BSCS field), the closest of: ${DOMAINS.filter((d) => d !== "General").join(", ")}. Otherwise General.
- Read the figures, tables and diagrams too (architecture, ERD, DFD, flowcharts, use-case diagrams, charts, result tables; in a Word file they come as images marked "[Figure n]" where they sit in the text): use what they show in the fields above and in facts.
- facts: 10 to 25 short, checkable facts a panel could catch a student contradicting: counts, sample sizes, tools and technologies, scales, scores, dates, names, and what the key diagrams show (e.g. "ERD: 6 entities incl. Student and Requirement (Ch. 3)"). Copy numbers exactly, and end each with where it appears, e.g. "Thirty (30) respondents: 20 students, 7 staff, 3 IT experts (Ch. 3)".
Use the manuscript's own numbers and names. Never invent or assume anything. If a field isn't stated clearly, give your best short reading of what is there (or "" if nothing) and list the field in unsure.`;
