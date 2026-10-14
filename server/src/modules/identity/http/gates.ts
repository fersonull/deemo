import type { NextFunction, Request, RequestHandler, Response } from "express";

import { authenticate, claimsOf, requireVerifiedEmail } from "../../../shared/auth/authenticate";
import { AppError } from "../../../shared/errors";
import { syncAccount } from "../application/accounts";
import type { Account } from "../domain/account";

// The signed-in student's account, set by syncUser.
export const accountOf = (req: Request) => (req as Request & { user: Account }).user;

// Gate 3: the Postgres account exists and follows Firebase (two-way sync, identity/application/accounts.ts).
export async function syncUser(req: Request, _res: Response, next: NextFunction) {
  (req as Request & { user: Account }).user = await syncAccount(claimsOf(req));
  next();
}

// Gate 4: no new work while "Delete my data" runs.
export function requireActive(req: Request, _res: Response, next: NextFunction) {
  if (accountOf(req).deletedAt) throw new AppError(403, "This account is being deleted.");
  next();
}

// AI routes need the student's consent (18+ and how their data is used) on record. The app shows the consent screen
// on CONSENT_REQUIRED.
export function requireConsent(req: Request, _res: Response, next: NextFunction) {
  if (!accountOf(req).consentAt) throw new AppError(403, "Accept the consent first.", "CONSENT_REQUIRED");
  next();
}

// For a route that is Premium as a whole (the simulated tier, addendum Q1). Finer limits live in the plan policy.
export function requirePremium(req: Request, _res: Response, next: NextFunction) {
  if (!accountOf(req).premium) throw new AppError(403, "That needs Premium.", "PREMIUM_REQUIRED");
  next();
}

// Every signed-in route: a valid token, a verified email, a synced account that isn't being deleted.
export const protect: RequestHandler[] = [authenticate, requireVerifiedEmail, syncUser, requireActive];
