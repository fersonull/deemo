import { generateObject } from "../../../shared/ai/gemini";
import {
  ANALYSIS_PROMPT,
  ANALYSIS_SCHEMA,
  AnalysisReply,
  DOCX,
  PDF,
  Rejected,
  type Analysis,
  type Domain,
  type DocOrImageType,
  type DocType,
} from "../domain/manuscript";
import { RUBRIC_PROMPT, RUBRIC_SCHEMA, RubricReply, rubricFromReply, type Rubric } from "../domain/rubric";
import { docxText } from "../infrastructure/docx";

// Document Logic Analysis (plan F2): a PDF goes to Gemini as-is (it reads scanned pages too), a DOCX as its text.
// Returns the analysis and the IT field it detected (the project's domain; "General" outside computing).
export async function analyzeManuscript(bytes: Uint8Array, type: DocType): Promise<{ analysis: Analysis; domain: Domain }> {
  let doc;
  if (type === PDF) doc = { inlineData: { mimeType: PDF, data: Buffer.from(bytes).toString("base64") } };
  else {
    const text = await docxText(bytes, "This isn't a readable Word document. Save it as .docx or PDF and try again.");
    // ponytail: a fixed floor; a real manuscript is tens of thousands of characters.
    if (text.trim().length < 500) throw new Rejected("We couldn't find enough text in this file. If it's scanned, upload it as a PDF.");
    doc = { text };
  }
  const { value, model } = await generateObject(
    {
      contents: [{ role: "user", parts: [doc, { text: ANALYSIS_PROMPT }] }],
      generationConfig: { responseMimeType: "application/json", responseJsonSchema: ANALYSIS_SCHEMA, temperature: 0.2 },
    },
    AnalysisReply,
  );
  const { isManuscript, notManuscriptReason, itField, ...analysis } = value;
  if (!isManuscript) throw new Rejected(notManuscriptReason || "This doesn't look like a research manuscript.");
  return { analysis: { ...analysis, model }, domain: analysis.field === "BSIT" || analysis.field === "BSCS" ? itField : "General" };
}

// Rubric upload (plan F3): the panel's own form, read into a whole rubric. Nothing is stored; the student reviews it
// and saves it to the project.
export async function readRubric(bytes: Uint8Array, type: DocOrImageType, source: string): Promise<Rubric> {
  let doc;
  if (type === DOCX) {
    const text = await docxText(bytes, "This isn't a readable Word document. Try a PDF or a photo of the rubric.");
    if (text.trim().length < 40) throw new Rejected("We couldn't find any text in this file. Try a PDF or a clear photo.");
    doc = { text };
  } else doc = { inlineData: { mimeType: type, data: Buffer.from(bytes).toString("base64") } };

  // A one-page form: copying it out needs little thinking, and a model that hasn't answered in 25 s is overloaded.
  const { value } = await generateObject(
    {
      contents: [{ role: "user", parts: [doc, { text: RUBRIC_PROMPT }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseJsonSchema: RUBRIC_SCHEMA,
        temperature: 0,
        thinkingConfig: { thinkingLevel: "low" },
      },
    },
    RubricReply,
    { timeoutMs: 25_000 },
  );
  if (!value.isRubric) throw new Rejected(value.notRubricReason || "This doesn't look like a defense rubric.");
  const rubric = rubricFromReply(value, source);
  if (!rubric.criteria.some((c) => c.scored))
    throw new Rejected("None of this rubric's criteria can be judged in a practice defense. DEEMO scores the oral defense only.");
  return rubric;
}
