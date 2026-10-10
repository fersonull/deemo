import express from "express";

import { Busy, MAX_BYTES, Rejected, analyzeManuscript, sniff } from "./analysis";
import { type Authed, getAuth, requireUser } from "./firebase";
import { DOMAINS, LIVE_MODEL, LOCKED_FIELDS, liveSetup, parseSetup } from "./panel";
import { parseSession, scoreSession, sessions, type Session } from "./sessions";
import { type Analysis, type Project, store, users } from "./store";

const app = express();
app.use(express.json({ limit: "1mb" })); // a 25-minute transcript outgrows the 100 kB default

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// Everything below belongs to a signed-in student (Firebase ID token), stored under users/{uid}.
app.use(["/me", "/projects", "/sessions", "/live"], requireUser);
const uidOf = (req: express.Request) => (req as Authed).uid;

// Free tier (addendum Q1): Title + Pre-Oral, 1 panelist, 10 minutes, one manuscript. Enforced here, not just in the app.
const FREE_PROJECTS = 1;

// Gemini rate-limited us (Busy); the transcript or upload is kept, so trying later works.
const BUSY = "The AI panel is busy right now. Try again in a few minutes.";

app.get("/me", async (req, res) => {
  res.json(await users.get(uidOf(req)));
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
  await users.removeAll(uid);
  await getAuth().deleteUser(uid);
  res.status(204).end();
});

// Upload a manuscript (plan F1). Answers right away; the analysis runs in the background and the app polls.
// The file only lives in memory for the analysis call; only the analysis is stored.
app.post("/projects", express.raw({ type: "multipart/form-data", limit: MAX_BYTES + 1_000_000 }), async (req, res) => {
  const uid = uidOf(req);
  const { premium } = await users.get(uid);
  if (!premium && (await store.list(uid)).filter((p) => p.status !== "failed").length >= FREE_PROJECTS)
    return void res.status(403).json({ error: "The free plan holds one manuscript. Delete it or try Premium." });

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

  const project = await store.put(uid, {
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
  const finish = async (patch: Partial<Project>) => (await store.get(uid, project.id)) && store.put(uid, { ...project, ...patch });
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
  res.json(await store.list(uidOf(req)));
});

app.get("/projects/:id", async (req, res) => {
  const project = await store.get(uidOf(req), req.params.id);
  if (!project) return void res.status(404).json({ error: "not found" });
  res.json(project);
});

// Deleting a project drops its analysis for good (the raw file was never kept).
app.delete("/projects/:id", async (req, res) => {
  await store.remove(uidOf(req), req.params.id);
  res.status(204).end();
});

const TEXT_FIELDS = ["title", "problem", "objectives", "method", "scope", "features", "limits", "results"] as const;

// The student's corrections to the summary, and "Looks right" (confirm).
app.patch("/projects/:id/analysis", async (req, res) => {
  const uid = uidOf(req);
  const project = await store.get(uid, req.params.id);
  if (!project?.analysis) return void res.status(404).json({ error: "not found" });
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
  res.json(
    await store.put(uid, {
      ...project,
      analysis: next,
      ...(body.confirm === true && { confirmedAt: new Date().toISOString() }),
    }),
  );
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
  const analysis = setup.projectId ? (await store.get(uid, setup.projectId))?.analysis : undefined; // else the sample

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
app.listen(port, () => console.log(`DEEMO server on :${port}`));
