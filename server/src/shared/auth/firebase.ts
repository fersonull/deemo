import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getMessaging } from "firebase-admin/messaging";

import { config } from "../config";

// Firebase Admin, for sign-in (addendum B5): verifying ID tokens and managing the Firebase user (name, delete); and
// Cloud Messaging, for notice push notifications (notices/infrastructure/push.ts).
// All app data lives in Postgres (shared/prisma.ts).
// FIREBASE_SERVICE_ACCOUNT is the key file's path (local) or the key's JSON itself (a host's environment variable).
const key = config.FIREBASE_SERVICE_ACCOUNT.trim();
initializeApp({ credential: cert((key.startsWith("{") ? JSON.parse(key) : await Bun.file(key).json()) as object) });

export { getAuth, getMessaging };
