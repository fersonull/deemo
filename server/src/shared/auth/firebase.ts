import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

import { config } from "../config";

// Firebase Admin, for sign-in only (addendum B5): verifying ID tokens and managing the Firebase user (name, delete).
// All app data lives in Postgres (shared/prisma.ts).
initializeApp({ credential: cert((await Bun.file(config.FIREBASE_SERVICE_ACCOUNT).json()) as object) });

export { getAuth };
