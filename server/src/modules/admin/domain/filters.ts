import type { Prisma } from "../../../../generated/prisma/client";

// The web admin's user search: name or email (case-insensitive), plan and verification.
export type UserFilter = { q?: string; plan?: "free" | "premium"; verified?: boolean };

export const PAGE_SIZE = 25;

export function userWhere({ q, plan, verified }: UserFilter): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = {};
  if (q) where.OR = [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }];
  if (plan) where.premium = plan === "premium";
  if (verified !== undefined) where.emailVerified = verified;
  return where;
}

// The admin's session list: stage, status, a date range and a search over the title and the student.
export type SessionFilter = {
  mode?: "TITLE" | "PRE_ORAL" | "FINAL";
  status?: "scoring" | "ready" | "failed";
  from?: Date;
  to?: Date; // inclusive day: the caller passes the start of the next day
  q?: string;
};

export function sessionWhere({ mode, status, from, to, q }: SessionFilter): Prisma.SessionWhereInput {
  const where: Prisma.SessionWhereInput = {};
  if (mode) where.mode = mode;
  if (status) where.status = status;
  if (from || to) where.createdAt = { ...(from && { gte: from }), ...(to && { lt: to }) };
  if (q)
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { user: { email: { contains: q, mode: "insensitive" } } },
      { user: { name: { contains: q, mode: "insensitive" } } },
    ];
  return where;
}
