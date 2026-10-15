import { Router } from "express";

import { AppError } from "../../../shared/errors";
import { rateLimit } from "../../../shared/rate-limit";
import { bodyOf, validate } from "../../../shared/validate";
import { accountOf, requireConsent } from "../../identity/http/gates";
import { createSession, getSession, listHistory, rescore } from "../application/sessions";
import { SessionBody } from "./schemas";

export const scoringRouter = Router();

const scoringLimit = rateLimit("scoring", { message: "That's a lot of scoring at once. Wait a while and try again." });

scoringRouter.post("/sessions", requireConsent, scoringLimit, validate({ body: SessionBody }), async (req, res) => {
  res.status(202).json(await createSession(accountOf(req).id, bodyOf(req, SessionBody)));
});

scoringRouter.post("/sessions/:id/score", requireConsent, scoringLimit, async (req, res) => {
  res.status(202).json(await rescore(accountOf(req).id, req.params.id as string));
});

scoringRouter.get("/sessions", async (req, res) => {
  res.json(await listHistory(accountOf(req).id));
});

scoringRouter.get("/sessions/:id", async (req, res) => {
  const session = await getSession(accountOf(req).id, req.params.id as string);
  if (!session) throw new AppError(404, "not found");
  res.json(session);
});
