import { Router } from "express";
import { z } from "zod";

import { authenticate, claimsOf } from "../../../shared/auth/authenticate";
import { config } from "../../../shared/config";
import { bodyOf, validate } from "../../../shared/validate";
import { grantAdmin, listAdmins, revokeAdmin } from "../application/admins";
import { changePremium, changeSignIn, listActions, removeUser, rescoreSession, resetDaily } from "../application/actions";
import { getSessionReport, listGroups, listProjects, listSessions } from "../application/catalog";
import { maintenance, setMaintenance } from "../application/maintenance";
import { overview } from "../application/overview";
import { getUser, listUserSessions, listUsers } from "../application/users";
import { requireAdmin } from "./gate";
import { adminNoticesRouter } from "../../notices/http/routes";

// The web admin's API (client/web/admin): overview, users (and their actions), sessions, manuscripts, groups, admins and
// the audit log. Admins sign in with the same Firebase project; only accounts with
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
adminRouter.use(adminNoticesRouter);

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

adminRouter.post("/admin/users/:id/reset-daily", validate({ params: Id }), async (req, res) => {
  await resetDaily(claimsOf(req), idOf(req));
  res.json({ ok: true });
});

adminRouter.get("/admin/overview", async (_req, res) => {
  res.json(await overview());
});

const search = z.string().trim().max(100).optional().transform((q) => q || undefined);
const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional();
// A Philippine calendar day (YYYY-MM-DD) to its start in UTC.
const manilaStart = (d: string, plusDays = 0) => new Date(Date.parse(`${d}T00:00:00+08:00`) + plusDays * 86_400_000);

const SessionsQuery = Page.extend({
  q: search,
  mode: z.enum(["TITLE", "PRE_ORAL", "FINAL"]).optional(),
  status: z.enum(["scoring", "ready", "failed"]).optional(),
  from: day,
  to: day,
});
adminRouter.get("/admin/sessions", validate({ query: SessionsQuery }), async (_req, res) => {
  const { page, from, to, ...rest } = res.locals.query as z.output<typeof SessionsQuery>;
  res.json(await listSessions({ ...rest, from: from ? manilaStart(from) : undefined, to: to ? manilaStart(to, 1) : undefined }, page));
});

adminRouter.get("/admin/sessions/:id", validate({ params: Id }), async (req, res) => {
  res.json(await getSessionReport(idOf(req)));
});

adminRouter.post("/admin/sessions/:id/rescore", validate({ params: Id }), async (req, res) => {
  await rescoreSession(claimsOf(req), idOf(req));
  res.json({ ok: true });
});

const ProjectsQuery = Page.extend({ q: search, status: z.enum(["analyzing", "ready", "failed"]).optional() });
adminRouter.get("/admin/projects", validate({ query: ProjectsQuery }), async (_req, res) => {
  const { page, ...filter } = res.locals.query as z.output<typeof ProjectsQuery>;
  res.json(await listProjects(filter, page));
});

const GroupsQuery = Page.extend({ q: search });
adminRouter.get("/admin/groups", validate({ query: GroupsQuery }), async (_req, res) => {
  const { page, q } = res.locals.query as z.output<typeof GroupsQuery>;
  res.json(await listGroups(q, page));
});

adminRouter.get("/admin/maintenance", async (_req, res) => {
  res.json(await maintenance());
});

const MaintenanceBody = z.object({
  on: z.boolean(),
  message: z.string().trim().max(280, "Keep the message under 280 characters.").optional().transform((m) => m || null),
});
adminRouter.patch("/admin/maintenance", validate({ body: MaintenanceBody }), async (req, res) => {
  const { on, message } = bodyOf(req, MaintenanceBody);
  res.json(await setMaintenance(claimsOf(req), on, message));
});

adminRouter.get("/admin/admins", async (_req, res) => {
  res.json({ admins: await listAdmins() });
});

const GrantBody = z.object({ email: z.email("Enter an email address.").max(320) });
adminRouter.post("/admin/admins", validate({ body: GrantBody }), async (req, res) => {
  await grantAdmin(claimsOf(req), bodyOf(req, GrantBody).email);
  res.json({ ok: true });
});

adminRouter.delete("/admin/admins/:id", validate({ params: Id }), async (req, res) => {
  await revokeAdmin(claimsOf(req), idOf(req));
  res.json({ ok: true });
});
