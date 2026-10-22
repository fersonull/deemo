import express from "express";

import { errorHandler } from "./shared/errors";
import { byIp, rateLimit } from "./shared/rate-limit";
import { adminRouter } from "./modules/admin/http/routes";
import { protect } from "./modules/identity/http/gates";
import { identityRouter } from "./modules/identity/http/routes";
import { manuscriptsRouter } from "./modules/manuscripts/http/routes";
import { groupsRouter } from "./modules/groups/http/routes";
import { practiceRouter } from "./modules/practice/http/routes";
import { scoringRouter } from "./modules/scoring/http/routes";
import { noticesRouter } from "./modules/notices/http/routes";

// DEEMO's API. Each domain module owns its routes; this file only wires
// the shared middleware around them.
export const app = express();
app.set("trust proxy", "loopback"); // the Cloudflare tunnel connects from localhost

// One line per request once it finishes: method, path, status, time and the student's ID when signed in. Never the
// body or headers (tokens, manuscripts, transcripts).
app.use((req, res, next) => {
  const start = performance.now();
  res.on("finish", () => {
    const user = (req as express.Request & { user?: { id: string } }).user?.id;
    const ms = Math.round(performance.now() - start);
    console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl.split("?")[0]} ${res.statusCode} ${ms}ms${user ? ` ${user}` : ""}`);
  });
  next();
});

// The Cloudflare tunnel (https://api.deemo-ai.com/api) passes its /api prefix through; the same routes answer under it.
app.use((req, _res, next) => {
  if (req.url === "/api" || req.url.startsWith("/api/")) req.url = req.url.slice(4) || "/";
  next();
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use(rateLimit("ip", { who: byIp, memory: true }));
app.use(express.json({ limit: "1mb" })); // an hour-long transcript outgrows the 100 kB default

// The web admin (client/web/admin): admin claim only, never a student account.
app.use(adminRouter);

// Everything below belongs to a signed-in student: a verified Firebase token, a synced account, not being deleted,
// and a per-student limit on writes. The module routers use full paths, so they mount at the root.
const writes = rateLimit("writes");
app.use(["/me", "/projects", "/sessions", "/live", "/rubric", "/groups", "/notices"], ...protect, (req, res, next) =>
  req.method === "GET" ? next() : writes(req, res, next),
);
app.use(identityRouter, manuscriptsRouter, groupsRouter, practiceRouter, scoringRouter, noticesRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "not found" });
});
app.use(errorHandler);
