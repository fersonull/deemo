import type { AuthClaims } from "../../../shared/auth/authenticate";
import { AppError } from "../../../shared/errors";
import { prisma, type Tx } from "../../../shared/prisma";
import { deleteAccount, resetDailyCount, setPremium, setSignInDisabled } from "../../identity/application/accounts";
import { rescore } from "../../scoring/application/sessions";
import { STUCK_MS } from "./overview";

// What an admin can change, each one written to the audit log (admin_actions). The account rules themselves live in
// identity (Premium, Firebase sign-in, Delete my data); this module only decides who may call them and records it.

export type AdminActionKind =
  | "premium_on"
  | "premium_off"
  | "sign_in_disabled"
  | "sign_in_enabled"
  | "account_deleted"
  | "daily_reset"
  | "session_rescored"
  | "admin_granted"
  | "admin_revoked"
  | "notice_sent";

export const AUDIT_PAGE_SIZE = 25;

async function target(admin: AuthClaims, id: string) {
  if (id === admin.uid) throw new AppError(403, "You can't change your own account here.");
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true } });
  if (!user) throw new AppError(404, "No such user.");
  return user;
}

export const record = (admin: AuthClaims, action: AdminActionKind, user: { id: string; email: string | null }, db: Tx | typeof prisma = prisma) =>
  db.adminAction.create({
    data: { adminId: admin.uid, adminEmail: admin.email, action, targetId: user.id, targetEmail: user.email },
  });

export async function changePremium(admin: AuthClaims, id: string, premium: boolean) {
  const user = await target(admin, id);
  await setPremium(id, premium);
  await record(admin, premium ? "premium_on" : "premium_off", user);
}

export async function changeSignIn(admin: AuthClaims, id: string, disabled: boolean) {
  const user = await target(admin, id);
  await setSignInDisabled(id, disabled);
  await record(admin, disabled ? "sign_in_disabled" : "sign_in_enabled", user);
}

// The same Delete my data the app runs: the Firebase user, then every row (cascade). The audit row has no foreign key,
// so it stays.
export async function removeUser(admin: AuthClaims, id: string) {
  const user = await target(admin, id);
  await deleteAccount(id);
  await record(admin, "account_deleted", user);
}

export async function resetDaily(admin: AuthClaims, id: string) {
  const user = await target(admin, id);
  await resetDailyCount(id);
  await record(admin, "daily_reset", user);
}

// Scoring again with the same rules the app's Try again uses, for a failed or stuck session; the owner is looked up first.
export async function rescoreSession(admin: AuthClaims, sessionId: string) {
  const session = await prisma.session.findUnique({ where: { id: sessionId }, select: { userId: true, status: true, updatedAt: true } });
  if (!session) throw new AppError(404, "No such session.");
  if (session.status === "ready") throw new AppError(409, "This session is already scored.");
  if (session.status === "scoring" && Date.now() - session.updatedAt.getTime() < STUCK_MS)
    throw new AppError(409, "It's still being scored. Try again in a few minutes if it doesn't finish.");
  const user = await target(admin, session.userId);
  await rescore(session.userId, sessionId);
  await record(admin, "session_rescored", user);
}

export async function listActions(page: number) {
  const [total, actions] = await Promise.all([
    prisma.adminAction.count(),
    prisma.adminAction.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * AUDIT_PAGE_SIZE, take: AUDIT_PAGE_SIZE }),
  ]);
  return { total, page, pageSize: AUDIT_PAGE_SIZE, actions };
}
