import express, { Router } from "express";
import { z } from "zod";

import { BadReply, Busy } from "../../../shared/ai/gemini";
import { AppError, BUSY } from "../../../shared/errors";
import { readForm } from "../../../shared/multipart";
import { rateLimit } from "../../../shared/rate-limit";
import { bodyOf, validate } from "../../../shared/validate";
import { accountOf, requireConsent } from "../../identity/http/gates";
import { accessibleProject, listProjects } from "../../groups/application/access";
import { DOMAINS, FIELDS, MAX_BYTES, Rejected, sniff, sniffDocOrImage } from "../domain/manuscript";
import { RubricInput } from "../domain/rubric";
import { editAnalysis, removeProject, saveRubric, uploadManuscript } from "../application/projects";
import { readRubric } from "../application/read-documents";

const IdParams = z.object({ id: z.string().regex(/^[A-Za-z0-9_-]{1,100}$/, "not found") });

// The default five weights: 5% steps, at most 60% each, totaling 100%.
const Weights = z
  .array(z.number().int().min(0).max(60).multipleOf(5), { error: "Use five weights in 5% steps, up to 60% each, totaling 100%." })
  .length(5, "Use five weights in 5% steps, up to 60% each, totaling 100%.")
  .refine((w) => w.reduce((a, b) => a + b, 0) === 100, "Use five weights in 5% steps, up to 60% each, totaling 100%.");
const RubricBody = z.union([z.object({ rubric: RubricInput }), z.object({ weights: Weights })], {
  error: "Use five weights in 5% steps, up to 60% each, totaling 100%.",
});

const AnalysisBody = z.object({
  analysis: z
    .object({
      ...(Object.fromEntries(FIELDS.map((f) => [f, z.string({ error: `${f} must be text` }).optional()])) as Record<
        (typeof FIELDS)[number],
        z.ZodOptional<z.ZodString>
      >),
      facts: z.array(z.string(), { error: "facts must be a list of text" }).optional(),
    })
    .default({}),
  confirm: z.boolean().optional(),
});

const UploadFields = z.object({
  domain: z.enum(DOMAINS, { error: "Pick a domain." }),
  fileName: z.string().transform((s) => s.slice(0, 200)),
  name: z.string().transform((s) => s.trim().slice(0, 80)),
});

export const manuscriptsRouter = Router();

// Upload a manuscript (plan F1). Answers right away; the analysis runs in the background and the app polls.
manuscriptsRouter.post(
  "/projects",
  requireConsent,
  rateLimit("upload", { message: "That's a lot of uploads. Wait a while and try again." }),
  express.raw({ type: "multipart/form-data", limit: MAX_BYTES + 1_000_000 }),
  async (req, res) => {
    const form = await readForm(req);
    const file = form?.get("file");
    if (!(file instanceof File)) throw new AppError(400, "Choose a PDF or DOCX.");
    if (file.size > MAX_BYTES) throw new AppError(413, "The file is over 20 MB.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const type = sniff(bytes);
    if (!type) throw new AppError(415, "Only PDF or DOCX files.");
    const fields = UploadFields.parse({
      domain: String(form?.get("domain") ?? ""),
      fileName: String(form?.get("fileName") || file.name), // the app's cached copy may be renamed
      name: String(form?.get("name") ?? ""),
    });
    const project = await uploadManuscript(accountOf(req), {
      bytes,
      type,
      size: file.size,
      domain: fields.domain,
      fileName: fields.fileName,
      name: fields.name || fields.fileName.replace(/\.(pdf|docx)$/i, ""),
    });
    res.status(202).json(project);
  },
);

manuscriptsRouter.get("/projects", async (req, res) => {
  res.json(await listProjects(accountOf(req).id));
});

manuscriptsRouter.get("/projects/:id", async (req, res) => {
  const project = await accessibleProject(accountOf(req).id, req.params.id as string);
  if (!project) throw new AppError(404, "not found");
  res.json(project);
});

manuscriptsRouter.delete("/projects/:id", validate({ params: IdParams }), async (req, res) => {
  await removeProject(accountOf(req).id, req.params.id as string);
  res.status(204).end();
});

manuscriptsRouter.patch("/projects/:id/rubric", validate({ params: IdParams, body: RubricBody }), async (req, res) => {
  res.json(await saveRubric(accountOf(req).id, req.params.id as string, bodyOf(req, RubricBody)));
});

manuscriptsRouter.patch("/projects/:id/analysis", validate({ params: IdParams, body: AnalysisBody }), async (req, res) => {
  const { analysis, confirm } = bodyOf(req, AnalysisBody);
  res.json(await editAnalysis(accountOf(req).id, req.params.id as string, analysis, confirm === true));
});

// Rubric upload (plan F3): read into a whole rubric that replaces the default. Nothing is stored here.
manuscriptsRouter.post(
  "/rubric/map",
  requireConsent,
  rateLimit("rubricMap", { message: "That's a lot of rubric uploads. Wait a while and try again." }),
  express.raw({ type: "multipart/form-data", limit: 11_000_000 }),
  async (req, res) => {
    const form = await readForm(req);
    const file = form?.get("file");
    if (!(file instanceof File)) throw new AppError(400, "Choose a PDF, DOCX or photo.");
    if (file.size > 10_000_000) throw new AppError(413, "The file is over 10 MB.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const type = sniffDocOrImage(bytes);
    if (!type) throw new AppError(415, "Only PDF, DOCX, JPG or PNG files.");
    try {
      res.json(await readRubric(bytes, type, file.name));
    } catch (err) {
      if (err instanceof Rejected) throw new AppError(422, err.message);
      if (err instanceof Busy) throw new AppError(503, BUSY);
      if (!(err instanceof BadReply)) console.error("rubric", err);
      throw new AppError(502, "We couldn't read this rubric. Try a clearer photo or a PDF.");
    }
  },
);
