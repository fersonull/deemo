import type { AuthClaims } from "../../../shared/auth/authenticate";
import { AppError } from "../../../shared/errors";
import { prisma } from "../../../shared/prisma";
import { deleteAccount, setPremium, setSignInDisabled } from "../../identity/application/accounts";

// What an admin can change, each one written to the audit log (admin_actions). The account rules themselves live in
// identity (Premium, Firebase sign-in, Delete my data); this module only decides who may call them and records it.

export type AdminActionKind = "premium_on" | "premium_off" | "sign_in_disabled" | "sign_in_enabled" | "account_deleted";

export const AUDIT_PAGE_SIZE = 25;

async function target(admin: AuthClaims, id: string) {
  if (id === admin.uid) throw new AppError(403, "You can't change your own account here.");
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true } });
  if (!user) throw new AppError(404, "No such user.");
  return user;
}

const record = (admin: AuthClaims, action: AdminActionKind, user: { id: string; email: string | null }) =>
  prisma.adminAction.create({
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

export async function listActions(page: number) {
  const [total, actions] = await Promise.all([
    prisma.adminAction.count(),
    prisma.adminAction.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * AUDIT_PAGE_SIZE, take: AUDIT_PAGE_SIZE }),
  ]);
  return { total, page, pageSize: AUDIT_PAGE_SIZE, actions };
}
