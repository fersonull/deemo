import { Router } from "express";
import { z } from "zod";

import { rateLimit } from "../../../shared/rate-limit";
import { bodyOf, validate } from "../../../shared/validate";
import { accountOf, requireConsent } from "../../identity/http/gates";
import { SetupInput } from "../domain/panel";
import { issueLiveToken } from "../application/live-token";

const TokenBody = SetupInput.extend({
  startId: z.string({ error: "invalid practice start" }).regex(/^[A-Za-z0-9_-]{1,100}$/, "invalid practice start"),
  resume: z.boolean({ error: "invalid practice start" }).default(false),
});

export const practiceRouter = Router();

// Mints a single-use Gemini Live token with the panel setup locked in (addendum B1).
practiceRouter.post(
  "/live/token",
  requireConsent,
  rateLimit("liveToken", { message: "Too many connection attempts. Wait a moment and try again." }),
  validate({ body: TokenBody }),
  async (req, res) => {
    res.json(await issueLiveToken(accountOf(req), bodyOf(req, TokenBody)));
  },
);
