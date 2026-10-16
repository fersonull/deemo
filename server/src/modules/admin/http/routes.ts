import { Router } from "express";
import { z } from "zod";

import { authenticate, claimsOf } from "../../../shared/auth/authenticate";
import { config } from "../../../shared/config";
import { bodyOf, validate } from "../../../shared/validate";
import { changePremium, changeSignIn, listActions, removeUser } from "../application/actions";
import { getUser, listUserSessions, listUsers } from "../application/users";
import { requireAdmin } from "./gate";

// The web admin's API (client/web/admin): user lookup, Premium, sign-in on/off, deletion and the audit log. Admins sign in with the same Firebase project; only accounts with
// the `admin` custom claim get in. syncUser is deliberately not used, so an admin never becomes a student row.
export const adminRouter = Router();

// The admin runs on another origin (Vercel), so the browser needs CORS, for ADMIN_ORIGINS only.
adminRouter.use("/admin", (req, res, next) => {
  const origin = req.headers.origin;
  if (origin && config.ADMIN_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "authorization, content-type");
    res.setHeader("Access-Control-Allow-Methods", "GET, PATCH, POST, DELETE");
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

const Id = z.object({ id: z.string().min(1).max(128) });
const Page = z.object({ page: z.coerce.number().int().min(1).max(10_000).default(1) });
const idOf = (req: { params: unknown }) => (req.params as z.output<typeof Id>).id;

adminRouter.get("/admin/users/:id", validate({ params: Id }), async (req, res) => {
  res.json(await getUser(idOf(req)));
});

adminRouter.get("/admin/users/:id/sessions", validate({ params: Id, query: Page }), async (req, res) => {
  res.json(await listUserSessions(idOf(req), (res.locals.query as z.output<typeof Page>).page));
});

const PremiumBody = z.object({ premium: z.boolean() });
adminRouter.patch("/admin/users/:id/premium", validate({ params: Id, body: PremiumBody }), async (req, res) => {
  await changePremium(claimsOf(req), idOf(req), bodyOf(req, PremiumBody).premium);
  res.json({ ok: true });
});

const SignInBody = z.object({ disabled: z.boolean() });
adminRouter.patch("/admin/users/:id/sign-in", validate({ params: Id, body: SignInBody }), async (req, res) => {
  await changeSignIn(claimsOf(req), idOf(req), bodyOf(req, SignInBody).disabled);
  res.json({ ok: true });
});

adminRouter.delete("/admin/users/:id", validate({ params: Id }), async (req, res) => {
  await removeUser(claimsOf(req), idOf(req));
  res.json({ ok: true });
});

adminRouter.get("/admin/audit", validate({ query: Page }), async (_req, res) => {
  res.json(await listActions((res.locals.query as z.output<typeof Page>).page));
});
