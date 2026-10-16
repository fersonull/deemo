import { Router } from "express";
import { z } from "zod";

import { authenticate } from "../../../shared/auth/authenticate";
import { config } from "../../../shared/config";
import { validate } from "../../../shared/validate";
import { getUser, listUsers } from "../application/users";
import { requireAdmin } from "./gate";

// The web admin's API (client/web/admin), read-only. Admins sign in with the same Firebase project; only accounts with
// the `admin` custom claim get in. syncUser is deliberately not used, so an admin never becomes a student row.
export const adminRouter = Router();

// The admin runs on another origin (Vercel), so the browser needs CORS, for ADMIN_ORIGINS only.
adminRouter.use("/admin", (req, res, next) => {
  const origin = req.headers.origin;
  if (origin && config.ADMIN_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "authorization, content-type");
    res.setHeader("Access-Control-Allow-Methods", "GET");
  }
  if (req.method === "OPTIONS") return void res.sendStatus(204);
  next();
});

adminRouter.use("/admin", authenticate, requireAdmin);

const ListQuery = z.object({
  q: z.string().trim().max(100).optional().transform((q) => q || undefined),
  plan: z.enum(["free", "premium"]).optional(),
  verified: z.enum(["true", "false"]).optional().transform((v) => (v === undefined ? undefined : v === "true")),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
});

adminRouter.get("/admin/users", validate({ query: ListQuery }), async (_req, res) => {
  const { page, ...filter } = res.locals.query as z.output<typeof ListQuery>;
  res.json(await listUsers(filter, page));
});

adminRouter.get("/admin/users/:id", validate({ params: z.object({ id: z.string().min(1).max(128) }) }), async (req, res) => {
  res.json(await getUser(req.params.id as string));
});
