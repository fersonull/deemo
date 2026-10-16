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
