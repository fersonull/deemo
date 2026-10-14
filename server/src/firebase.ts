import type { NextFunction, Request, Response } from "express";
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

export { getAuth };

// Firebase Admin (addendum B5): the server verifies who's calling and is the only one touching Firestore.
// Credentials: FIREBASE_SERVICE_ACCOUNT points at the service-account JSON (see server/.env.example).
const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!keyPath) throw new Error("FIREBASE_SERVICE_ACCOUNT is not set. Add the service-account key path to server/.env.");

initializeApp({ credential: cert((await Bun.file(keyPath).json()) as object) });

export const db = getFirestore();
// REST instead of gRPC (sturdier under Bun); undefined fields are dropped instead of rejected.
db.settings({ preferRest: true, ignoreUndefinedProperties: true });

export type Authed = Request & { uid: string };

// Every data route needs a signed-in student: the app sends its Firebase ID token as a Bearer token.
export async function requireUser(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return void res.status(401).json({ error: "Sign in first." });
  let user;
  try {
    // checkRevoked: a deleted, disabled or signed-out-everywhere account stops working at once, not when its token expires.
    user = await getAuth().verifyIdToken(token, true);
  } catch {
    return void res.status(401).json({ error: "Your sign-in expired. Sign in again." });
  }
  // Email + password accounts must tap the verification link first (Google accounts arrive verified).
  if (user.email && !user.email_verified) return void res.status(403).json({ error: "Verify your email first." });
  (req as Authed).uid = user.uid;
  next();
}
