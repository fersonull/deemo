import express from "express";

import { Busy, MAX_BYTES, Rejected, analyzeManuscript, sniff, sniffDocOrImage } from "./analysis";
import { mapRubric } from "./rubric";
import { type Authed, getAuth, requireUser } from "./firebase";
import { DOMAINS, LIVE_MODEL, LOCKED_FIELDS, liveSetup, parseSetup } from "./panel";
import { parseSession, scoreSession, sessions, type Session } from "./sessions";
import { type Analysis, type Project, store, users } from "./store";
import { db } from "./firebase";
import {
  GroupError,
  accessibleProject,
  createGroup,
  groupReadiness,
  joinGroup,
  leaveGroup,
  listProjects,
  removeMemberships,
  removeProject,
  reserveProject,
  updateMember,
  validWeights,
} from "./groups";

const app = express();
// The Cloudflare tunnel (https://api.deemo-ai.com/api) passes its /api prefix through; the same routes answer under it.
app.use((req, _res, next) => {
  if (req.url === "/api" || req.url.startsWith("/api/")) req.url = req.url.slice(4) || "/";
  next();
});
app.use(express.json({ limit: "1mb" })); // a 25-minute transcript outgrows the 100 kB default

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// Everything below belongs to a signed-in student (Firebase ID token), stored under users/{uid}.
app.use(["/me", "/projects", "/sessions", "/live", "/rubric", "/groups"], requireUser);
const uidOf = (req: express.Request) => (req as Authed).uid;

// Free tier (addendum Q1): Title + Pre-Oral, 1 panelist, 10 minutes, one manuscript. Enforced here, not just in the app.

// Gemini rate-limited us (Busy); the transcript or upload is kept, so trying later works.
const BUSY = "The AI panel is busy right now. Try again in a few minutes.";

app.get("/me", async (req, res) => {
  res.json(await users.get(uidOf(req)));
});

// Download my data (plan §17 user rights): everything kept about the student, as one JSON file. Projects include the
// group ones they can open (with their own membership settings); other members' sessions are never included.
app.get("/me/export", async (req, res) => {
  const uid = uidOf(req);
  const [user, account, projects, history] = await Promise.all([
    getAuth().getUser(uid),
    users.get(uid),
    listProjects(uid),
    sessions.list(uid),
  ]);
  res.json({
    exportedAt: new Date().toISOString(),
    email: user.email ?? null,
    name: user.displayName ?? null,
    account,
    projects,
    sessions: history,
  });
});

// Consent (recorded after sign-in, with the version the student agreed to) and the simulated upgrade.
app.patch("/me", async (req, res) => {
  const uid = uidOf(req);
  const body = (req.body ?? {}) as { consentVersion?: unknown; premium?: unknown; allowTyping?: unknown };
  if (typeof body.consentVersion === "string")
    await users.update(uid, { consentVersion: body.consentVersion.slice(0, 20), consentAt: new Date().toISOString() });
  // ponytail: demo toggle, no payments (addendum Q1).
  if (body.premium === true) await users.update(uid, { premium: true });
  if (typeof body.allowTyping === "boolean") await users.update(uid, { allowTyping: body.allowTyping });
  res.json(await users.get(uid));
});

// Delete my data (addendum Q9, RA 10173): manuscript analyses, transcripts, reports, the account record and the
// sign-in account itself. Done here with the Admin SDK, so it works however long ago the student signed in.
app.delete("/me", async (req, res) => {
  const uid = uidOf(req);
  await removeMemberships(uid);
  await users.removeAll(uid);
  await getAuth().deleteUser(uid);
  res.status(204).end();
});

// Upload a manuscript (plan F1). Answers right away; the analysis runs in the background and the app polls.
// The file only lives in memory for the analysis call; only the analysis is stored.
app.post("/projects", express.raw({ type: "multipart/form-data", limit: MAX_BYTES + 1_000_000 }), async (req, res) => {
  const uid = uidOf(req);

  const form = await new Response(req.body, { headers: { "content-type": req.headers["content-type"] ?? "" } })
    .formData()
    .catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return void res.status(400).json({ error: "Choose a PDF or DOCX." });
  if (file.size > MAX_BYTES) return void res.status(413).json({ error: "The file is over 20 MB." });
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniff(bytes);
  if (!type) return void res.status(415).json({ error: "Only PDF or DOCX files." });
  const domain = String(form?.get("domain") ?? "");
  if (!DOMAINS.includes(domain as (typeof DOMAINS)[number])) return void res.status(400).json({ error: "Pick a domain." });
  const fileName = String(form?.get("fileName") || file.name).slice(0, 200); // the app's cached copy may be renamed
  const name =
    String(form?.get("name") ?? "")
      .trim()
      .slice(0, 80) || fileName.replace(/\.(pdf|docx)$/i, "");

  const project = await reserveProject(uid, {
    id: crypto.randomUUID(),
    name,
    domain,
    fileName,
    sizeBytes: file.size,
    createdAt: new Date().toISOString(),
    status: "analyzing",
  });
  res.status(202).json(project);

  // Only if it still exists: the student may have deleted it while it was being read.
  const finish = async (patch: Partial<Project>) =>
    (await store.get(uid, project.id)) && store.put(uid, { ...project, ...patch });
  analyzeManuscript({ bytes, type }).then(
    (analysis) => finish({ status: "ready", analysis }),
    (err) => {
      if (!(err instanceof Rejected)) console.error("analysis", project.id, err);
      const error =
        err instanceof Rejected
          ? err.message
          : err instanceof Busy
            ? BUSY
            : "We couldn't read this file. Try a text-based PDF or a DOCX.";
      return finish({ status: "failed", error });
    },
  );
});

app.get("/projects", async (req, res) => {
  res.json(await listProjects(uidOf(req)));
});

app.get("/projects/:id", async (req, res) => {
  const project = await accessibleProject(uidOf(req), req.params.id);
  if (!project) return void res.status(404).json({ error: "not found" });
  res.json(project);
});

// Deleting a project drops its analysis for good (the raw file was never kept).
app.delete("/projects/:id", async (req, res) => {
  await removeProject(uidOf(req), req.params.id);
  res.status(204).end();
});

const memberName = async (uid: string) => (await getAuth().getUser(uid)).displayName?.trim().slice(0, 60) || "Group member";
app.post("/projects/:id/group", async (req, res) => {
  const uid = uidOf(req);
  res.json(await createGroup(uid, req.params.id, await memberName(uid)));
});
app.post("/groups/join", async (req, res) => {
  const uid = uidOf(req);
  res.json(await joinGroup(uid, req.body?.code, await memberName(uid)));
});
app.get("/groups", async (req, res) => res.json(await groupReadiness(uidOf(req))));
app.patch("/groups/:code/me", async (req, res) => {
  await updateMember(uidOf(req), req.params.code, req.body);
  res.status(204).end();
});
app.delete("/groups/:code/me", async (req, res) => {
  await leaveGroup(uidOf(req), req.params.code);
  res.status(204).end();
});
app.patch("/projects/:id/rubric", async (req, res) => {
  if (!validWeights(req.body?.weights))
    return void res.status(400).json({ error: "Use five weights in 5% steps, up to 60% each, totaling 100%." });
  const uid = uidOf(req);
  const p = await accessibleProject(uid, req.params.id);
  if (!p) throw new GroupError(404, "Project not found.");
  if (p.group && !p.group.isOwner) throw new GroupError(403, "Only the group leader can edit the shared rubric.");
  await db.collection("users").doc(uid).collection("projects").doc(p.id).update({ weights: req.body.weights });
  res.json(await accessibleProject(uid, p.id));
});

// Rubric upload (plan F3): map the panel's own form onto the five criteria and propose weights. Nothing is stored.
app.post("/rubric/map", express.raw({ type: "multipart/form-data", limit: 11_000_000 }), async (req, res) => {
  const form = await new Response(req.body, { headers: { "content-type": req.headers["content-type"] ?? "" } })
    .formData()
    .catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return void res.status(400).json({ error: "Choose a PDF, DOCX or photo." });
  if (file.size > 10_000_000) return void res.status(413).json({ error: "The file is over 10 MB." });
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffDocOrImage(bytes);
  if (!type) return void res.status(415).json({ error: "Only PDF, DOCX, JPG or PNG files." });
  try {
    res.json(await mapRubric({ bytes, type }));
  } catch (err) {
    if (err instanceof Rejected) return void res.status(422).json({ error: err.message });
    if (err instanceof Busy) return void res.status(503).json({ error: BUSY });
    console.error("rubric", err);
    res.status(502).json({ error: "We couldn't read this rubric. Try a clearer photo or a PDF." });
  }
});

const TEXT_FIELDS = ["title", "problem", "objectives", "method", "scope", "features", "limits", "results"] as const;

// The student's corrections to the summary, and "Looks right" (confirm).
app.patch("/projects/:id/analysis", async (req, res) => {
  const uid = uidOf(req);
  const project = await accessibleProject(uid, req.params.id);
  if (!project?.analysis) return void res.status(404).json({ error: "not found" });
  if (project.group && !project.group.isOwner)
    return void res.status(403).json({ error: "Only the group leader can edit the summary." });
  const body = (req.body ?? {}) as { analysis?: Partial<Record<keyof Analysis, unknown>>; confirm?: unknown };
  const edits = body.analysis ?? {};
  const next: Analysis = { ...project.analysis };
  for (const f of TEXT_FIELDS) {
    if (edits[f] === undefined) continue;
    if (typeof edits[f] !== "string") return void res.status(400).json({ error: `${f} must be text` });
    next[f] = (edits[f] as string).slice(0, 2000);
    next.unsure = next.unsure.filter((u) => u !== f); // the student vouched for it
  }
  if (edits.facts !== undefined) {
    if (!Array.isArray(edits.facts) || !edits.facts.every((x) => typeof x === "string"))
      return void res.status(400).json({ error: "facts must be a list of text" });
    next.facts = (edits.facts as string[])
      .map((x) => x.trim().slice(0, 300))
      .filter(Boolean)
      .slice(0, 40);
  }
  await db
    .collection("users")
    .doc(uid)
    .collection("projects")
    .doc(project.id)
    .update({
      analysis: next,
      ...(body.confirm === true && { confirmedAt: new Date().toISOString() }),
    });
  res.json(await accessibleProject(uid, project.id));
});

// A finished session (plan F14): saved right away, scored in the background (Flash for rubric levels and
// feedback, code for the score). The app polls GET /sessions/:id.
function score(uid: string, session: Session) {
  scoreSession(uid, session).then(
    // Only if it still exists: the student may have deleted their data while it was being scored.
    async (report) => (await sessions.get(uid, session.id)) && sessions.put(uid, { ...session, status: "ready", report }),
    async (err) => {
      console.error("scoring", session.id, err);
      if (!(await sessions.get(uid, session.id))) return;
      const error = err instanceof Busy ? BUSY : "We couldn't score this session. Try again.";
      return sessions.put(uid, { ...session, status: "failed", error });
    },
  );
}

app.post("/sessions", async (req, res) => {
  const uid = uidOf(req);
  const parsed = await parseSession(uid, req.body);
  if (!parsed) return void res.status(400).json({ error: "invalid session" });
  const session = await sessions.put(uid, {
    ...parsed,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    status: "scoring",
  });
  res.status(202).json(session);
  score(uid, session);
});

// Re-score a session whose scoring failed; its transcript was kept.
app.post("/sessions/:id/score", async (req, res) => {
  const uid = uidOf(req);
  const found = await sessions.get(uid, req.params.id);
  if (!found) return void res.status(404).json({ error: "not found" });
  const session = await sessions.put(uid, { ...found, status: "scoring", error: undefined, report: undefined });
  res.status(202).json(session);
  score(uid, session);
});

// History rows: no transcripts, just what the list shows.
app.get("/sessions", async (req, res) => {
  const list = await sessions.list(uidOf(req));
  res.json(
    list.map(({ id, createdAt, status, mode, title, durationMs, report }) => ({
      id,
      createdAt,
      status,
      mode,
      title,
      durationMs,
      score: report?.scored === false ? undefined : report?.score, // no score stays out of Home and the trend
      band: report?.band,
      tip: report?.fixes[0]?.text, // the Home card's one line
    })),
  );
});

app.get("/sessions/:id", async (req, res) => {
  const session = await sessions.get(uidOf(req), req.params.id);
  if (!session) return void res.status(404).json({ error: "not found" });
  res.json(session);
});

// Mints a single-use Gemini Live token with the panel setup locked in (addendum B1).
// The app calls this before every connect, including reconnects (the resumption handle carries the session).
app.post("/live/token", async (req, res) => {
  const uid = uidOf(req);
  const setup = parseSetup(req.body);
  if (!setup) return void res.status(400).json({ error: "invalid setup" });
  const { premium } = await users.get(uid);
  if (!premium && (setup.mode === "FINAL" || setup.panelists > 1 || setup.minutes > 10))
    return void res.status(403).json({ error: "That setup needs Premium." });
  const project = setup.projectId ? await accessibleProject(uid, setup.projectId) : null;
  if (setup.projectId && (!project?.analysis || !project.confirmedAt))
    return void res.status(403).json({ error: "This manuscript is unavailable. Choose a reviewed project." });
  setup.focusArea = project?.group?.focusArea;
  const analysis = project?.analysis;

  const now = Date.now();
  const r = await fetch("https://generativelanguage.googleapis.com/v1beta/auth_tokens", {
    method: "POST",
    headers: { "x-goog-api-key": process.env.GEMINI_API_KEY ?? "", "content-type": "application/json" },
    body: JSON.stringify({
      uses: 1,
      newSessionExpireTime: new Date(now + 60_000).toISOString(),
      expireTime: new Date(now + (setup.minutes + 30) * 60_000).toISOString(), // session plus pauses
      bidiGenerateContentSetup: liveSetup(setup, analysis),
      fieldMask: LOCKED_FIELDS,
    }),
  });
  if (!r.ok) {
    console.error("auth_tokens", r.status, await r.text());
    return void res.status(502).json({ error: "token mint failed" });
  }
  const { name } = (await r.json()) as { name: string };
  res.json({ token: name, model: LIVE_MODEL });
});

const port = Number(process.env.PORT) || 3000;
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof GroupError) return void res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: "Something went wrong. Try again." });
});
export { app };
if (import.meta.main) app.listen(port, () => console.log(`DEEMO server on :${port}`));
