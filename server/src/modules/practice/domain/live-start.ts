import { AppError } from "../../../shared/errors";
import { planOf, setupProblem } from "../../identity/domain/plan";
import type { PanelSetup } from "./panel";

// Daily practice starts (addendum Q1): a start is reserved before its Gemini Live token is minted, under a stable start
// ID the app picks, so concurrent requests and lost replies are safe to retry. These rules are pure; the application
// runs them inside one serializable transaction (practice/application/live-token.ts).

// Calendar days in Manila, independent of the server's timezone.
export const sessionDay = (now: number) => new Date(now + 8 * 60 * 60_000).toISOString().slice(0, 10);

export const LEASE_MS = 30_000; // a mint in progress; after this a crashed attempt can be taken over
export const NEW_SESSION_MS = 60_000; // the first connect must happen within a minute of minting

export type StartState = {
  day: string;
  setup: string; // fingerprint of the setup the token is locked to
  lease: string;
  pendingUntil: number;
  expiresAt: number;
  token?: string;
  newSessionUntil?: number;
};

type Counter = { premium: boolean; sessionDay: string | null; sessionCount: number };

export type StartDecision =
  | { kind: "cached"; start: StartState } // the token was already minted: hand it out again
  | { kind: "retake"; start: StartState } // an earlier attempt's lease ran out: mint again, no new slot
  | { kind: "new"; start: StartState; day: string; count: number }; // a new round takes one of today's slots

export function decideStart(i: {
  previous: StartState | null;
  account: Counter;
  setup: PanelSetup;
  fingerprint: string;
  resume: boolean;
  lease: string;
  now: number;
}): StartDecision {
  const { previous, now } = i;
  if (previous) {
    if (previous.setup !== i.fingerprint) throw new AppError(400, "Start a new practice round after changing its setup.");
    if (previous.expiresAt <= now || (previous.token && !i.resume && (previous.newSessionUntil ?? 0) <= now))
      throw new AppError(410, "This practice connection expired. Go back to setup and start again.");
    if (previous.token) return { kind: "cached", start: previous };
    if (previous.pendingUntil > now) throw new AppError(503, "Getting the panel ready. Please try again.");
    return { kind: "retake", start: { ...previous, lease: i.lease, pendingUntil: now + LEASE_MS } };
  }
  if (i.resume) throw new AppError(404, "This practice round is unavailable. Go back to setup and start again.");
  const problem = setupProblem(i.account.premium, i.setup);
  if (problem) throw new AppError(problem.status, problem.message);
  const day = sessionDay(now);
  const used = i.account.sessionDay === day ? i.account.sessionCount : 0;
  const cap = planOf(i.account.premium).dailySessions;
  if (used >= cap)
    throw new AppError(429, `You've used today's ${cap} practice sessions. Your allowance resets at midnight (Philippine time).`);
  return {
    kind: "new",
    day,
    count: used + 1,
    start: { day, setup: i.fingerprint, lease: i.lease, pendingUntil: now + LEASE_MS, expiresAt: now + (i.setup.minutes + 30) * 60_000 },
  };
}

export type FinishDecision =
  | { kind: "ignore" } // another attempt owns this start now, or it already has its token
  | { kind: "save"; token: string; newSessionUntil: number }
  | { kind: "refund"; count: number | null }; // the mint failed: drop the start and give the slot back (same day only)

export function decideFinish(i: {
  start: StartState | null;
  account: Counter;
  lease: string;
  token?: string;
  newSessionUntil?: number;
}): FinishDecision {
  const { start } = i;
  if (!start || start.lease !== i.lease || start.token) {
    if (i.token) throw new AppError(503, "This connection attempt expired. Please try again.");
    return { kind: "ignore" };
  }
  if (i.token) return { kind: "save", token: i.token, newSessionUntil: i.newSessionUntil! };
  return { kind: "refund", count: i.account.sessionDay === start.day ? Math.max(0, i.account.sessionCount - 1) : null };
}

// A later panelist's seat (sequential panel: each panelist questions in turn, in their own voice). It belongs to a start
// that already reserved today's slot and connected, for the same setup, before the round expires; it uses no new slot.
export function decideSeat(i: { previous: StartState | null; fingerprint: string; seat: number; panelists: number; now: number }) {
  const { previous } = i;
  if (!Number.isInteger(i.seat) || i.seat < 1 || i.seat >= i.panelists) throw new AppError(400, "invalid practice start");
  if (!previous || !previous.token) throw new AppError(404, "This practice round is unavailable. Go back to setup and start again.");
  if (previous.setup !== i.fingerprint) throw new AppError(400, "Start a new practice round after changing its setup.");
  if (previous.expiresAt <= i.now) throw new AppError(410, "This practice connection expired. Go back to setup and start again.");
  return { expiresAt: previous.expiresAt };
}
