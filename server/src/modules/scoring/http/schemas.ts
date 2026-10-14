import { z } from "zod";

import { SetupInput } from "../../practice/domain/panel";

// The app's end-of-session payload (trust boundary). Like before, odd values are coerced and long text is cut rather
// than the whole session rejected, so a finished practice is never lost to one bad field; the structure must be right.
const INT_MAX = 2_147_483_647;
const int = z
  .unknown()
  .optional()
  .transform((x) => (typeof x === "number" && Number.isFinite(x) ? Math.max(-INT_MAX, Math.min(INT_MAX, Math.round(x))) : 0));
const text = (max: number) => z.unknown().optional().transform((x) => (typeof x === "string" ? x.slice(0, max) : ""));

const Turn = z.object({
  number: int,
  followUp: int,
  type: text(20),
  panelist: int,
  question: text(600),
  answer: text(4000),
  latencyMs: z.unknown().optional().transform((x) => (typeof x === "number" && Number.isFinite(x) ? Math.max(0, Math.min(INT_MAX, Math.round(x))) : null)),
  answerMs: int,
});

const Line = z.object({
  who: z.unknown().optional().transform((w) => (w === "you" ? ("you" as const) : typeof w === "number" && Number.isFinite(w) ? w : 0)),
  text: text(4000),
  flagged: z.unknown().optional().transform((f) => (f === true ? true : undefined)),
}).transform(({ flagged, ...l }) => (flagged ? { ...l, flagged } : l));

const Flag = z.object({
  spokenClaim: text(400),
  manuscriptEvidence: text(400),
  severity: z.enum(["LOW", "MEDIUM", "HIGH"]).catch("LOW"),
  atMs: int,
});

const list = <T extends z.ZodType>(item: T, max: number) =>
  z.array(item, { error: "invalid session" }).transform((xs) => xs.slice(0, max));

export const SessionBody = SetupInput.extend({
  turns: list(Turn, 60),
  lines: list(Line, 400),
  flags: list(Flag, 40),
  // Five non-negative weights with at least one above zero; anything else falls back to the defaults.
  weights: z
    .unknown()
    .optional()
    .transform((w) =>
      Array.isArray(w) && w.length === 5 && w.every((x) => typeof x === "number" && x >= 0) && w.some((x) => x > 0) ? (w as number[]) : null,
    ),
  durationMs: int,
  endedBy: z.unknown().optional().transform((e) => (e === "panel" || e === "time" ? e : ("student" as const))),
});
