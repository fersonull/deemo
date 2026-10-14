import express from "express";

import { errorHandler } from "./shared/errors";
import { byIp, rateLimit } from "./shared/rate-limit";
import { protect } from "./modules/identity/http/gates";
import { identityRouter } from "./modules/identity/http/routes";
import { manuscriptsRouter } from "./modules/manuscripts/http/routes";
import { groupsRouter } from "./modules/groups/http/routes";
import { practiceRouter } from "./modules/practice/http/routes";
import { scoringRouter } from "./modules/scoring/http/routes";

// DEEMO's API. Each module (identity, manuscripts, groups, practice, scoring) owns its routes; this file only wires
// the shared middleware around them.
export const app = express();
app.set("trust proxy", "loopback"); // the Cloudflare tunnel connects from localhost

// The Cloudflare tunnel (https://api.deemo-ai.com/api) passes its /api prefix through; the same routes answer under it.
app.use((req, _res, next) => {
  if (req.url === "/api" || req.url.startsWith("/api/")) req.url = req.url.slice(4) || "/";
  next();
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use(rateLimit("ip", { who: byIp }));
app.use(express.json({ limit: "1mb" })); // a 25-minute transcript outgrows the 100 kB default

// Everything below belongs to a signed-in student: a verified Firebase token, a synced account, not being deleted,
// and a per-student limit on writes. The module routers use full paths, so they mount at the root.
const writes = rateLimit("writes");
app.use(["/me", "/projects", "/sessions", "/live", "/rubric", "/groups"], ...protect, (req, res, next) =>
  req.method === "GET" ? next() : writes(req, res, next),
);
app.use(identityRouter, manuscriptsRouter, groupsRouter, practiceRouter, scoringRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "not found" });
});
app.use(errorHandler);
