import type { NextFunction, Request, Response } from "express";

import { AppError } from "../errors";
import { getAuth } from "./firebase";

// Who the verified Firebase ID token says is calling.
export type AuthClaims = {
  uid: string;
  email: string | null;
  name: string | null;
  emailVerified: boolean;
  provider: string | null; // "password", "google.com", ...
};

export const claimsOf = (req: Request) => (req as Request & { auth: AuthClaims }).auth;

// Gate 1: every data route needs a signed-in student; the app sends its Firebase ID token as a Bearer token.
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw new AppError(401, "Sign in first.");
  let decoded;
  try {
    // checkRevoked: a deleted, disabled or signed-out-everywhere account stops working at once, not when its token expires.
    decoded = await getAuth().verifyIdToken(token, true);
  } catch {
    throw new AppError(401, "Your sign-in expired. Sign in again.");
  }
  (req as Request & { auth: AuthClaims }).auth = {
    uid: decoded.uid,
    email: decoded.email ?? null,
    name: typeof decoded.name === "string" ? decoded.name.trim().slice(0, 60) || null : null,
    emailVerified: decoded.email_verified === true,
    provider: decoded.firebase?.sign_in_provider ?? null,
  };
  next();
}

// Gate 2: email + password accounts must tap the verification link first (Google accounts arrive verified).
export function requireVerifiedEmail(req: Request, _res: Response, next: NextFunction) {
  const auth = claimsOf(req);
  if (auth.email && !auth.emailVerified) throw new AppError(403, "Verify your email first.");
  next();
}
