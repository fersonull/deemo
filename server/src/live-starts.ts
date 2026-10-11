import { db } from "./firebase";
import type { PanelSetup } from "./panel";

export class LiveStartError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// Q1: calendar days in Manila, independent of the server's timezone.
export const sessionDay = (now: number) => new Date(now + 8 * 60 * 60_000).toISOString().slice(0, 10);
const userRef = (uid: string) => db.collection("users").doc(uid);
const startRef = (uid: string, id: string) => userRef(uid).collection("liveStarts").doc(id);
type Start = {
  day: string;
  setup: string;
  lease: string;
  pendingUntil: number;
  expiresAt: number;
  newSessionUntil?: number;
  token?: string;
};

// Reserve before minting; a stable start ID makes concurrent requests and lost replies safe to retry.
export async function reserveLiveStart(uid: string, id: string, setup: PanelSetup, resume: boolean) {
  const now = Date.now();
  const lease = crypto.randomUUID();
  return db.runTransaction(async (tx) => {
    const [user, saved] = await Promise.all([tx.get(userRef(uid)), tx.get(startRef(uid, id))]);
    const u = user.data();
    if (u?.deleting) throw new LiveStartError(403, "This account is being deleted.");
    const fingerprint = JSON.stringify(setup);
    const previous = saved.data() as Start | undefined;
    if (previous) {
      if (previous.setup !== fingerprint) throw new LiveStartError(400, "Start a new practice round after changing its setup.");
      if (previous.expiresAt <= now || (previous.token && !resume && previous.newSessionUntil! <= now))
        throw new LiveStartError(410, "This practice connection expired. Go back to setup and start again.");
      if (previous.token) return { ...previous, cached: true };
      if (previous.pendingUntil > now) throw new LiveStartError(503, "Getting the panel ready. Please try again.");
      const next = { ...previous, lease, pendingUntil: now + 30_000 };
      tx.set(startRef(uid, id), next);
      return { ...next, cached: false };
    }
    if (resume) throw new LiveStartError(404, "This practice round is unavailable. Go back to setup and start again.");
    const premium = u?.premium === true;
    if (!premium && (setup.mode === "FINAL" || setup.panelists > 1 || setup.minutes > 10))
      throw new LiveStartError(403, "That setup needs Premium.");
    if (setup.minutes > 25) throw new LiveStartError(400, "Practice rounds can last up to 25 minutes.");
    const day = sessionDay(now);
    const count = u?.sessionDay === day ? (u.sessionCount ?? 0) : 0;
    const cap = premium ? 10 : 2;
    if (count >= cap)
      throw new LiveStartError(429, `You've used today's ${cap} practice sessions. Your allowance resets at midnight (Philippine time).`);
    const next: Start = { day, setup: fingerprint, lease, pendingUntil: now + 30_000, expiresAt: now + (setup.minutes + 30) * 60_000 };
    tx.set(userRef(uid), { sessionDay: day, sessionCount: count + 1 }, { merge: true });
    tx.set(startRef(uid, id), next);
    return { ...next, cached: false };
  });
}

export async function finishLiveStart(uid: string, id: string, lease: string, token?: string, newSessionUntil?: number) {
  await db.runTransaction(async (tx) => {
    const [saved, user] = await Promise.all([tx.get(startRef(uid, id)), tx.get(userRef(uid))]);
    const start = saved.data() as Start | undefined;
    if (!start || start.lease !== lease || start.token) {
      if (token) throw new LiveStartError(503, "This connection attempt expired. Please try again.");
      return;
    }
    if (token) {
      tx.update(startRef(uid, id), { token, newSessionUntil });
    } else {
      tx.delete(startRef(uid, id));
      const u = user.data();
      if (u?.sessionDay === start.day)
        tx.update(userRef(uid), { sessionCount: Math.max(0, u.sessionCount - 1) });
    }
  });
}
