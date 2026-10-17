import type { Request, RequestHandler } from "express";

import { prisma } from "./prisma";

// Fixed-window rate limits, counted in Postgres so every server instance shares them. Over the limit: 429 with
// Retry-After. If the database can't be reached the request goes through (the routes themselves will fail anyway).

export const LIMITS = {
  ip: { limit: 300, windowMs: 60_000 }, // every request, per client IP
  writes: { limit: 60, windowMs: 60_000 }, // POST/PATCH/DELETE, per student
  upload: { limit: 10, windowMs: 60 * 60_000 }, // manuscript uploads
  rubricMap: { limit: 20, windowMs: 60 * 60_000 },
  scoring: { limit: 30, windowMs: 60 * 60_000 }, // saved sessions and rescoring
  groupJoin: { limit: 10, windowMs: 60_000 }, // code guesses
  noticeSend: { limit: 10, windowMs: 60_000 }, // per administrator, broadcast or private
  liveToken: { limit: 10, windowMs: 60_000 }, // bursts; the daily practice cap is separate (practice module)
} as const;

export const windowStart = (now: number, windowMs: number) => Math.floor(now / windowMs) * windowMs;
export const retryAfterSeconds = (now: number, windowMs: number) => Math.max(1, Math.ceil((windowStart(now, windowMs) + windowMs - now) / 1000));

// Behind the Cloudflare tunnel every request comes from localhost; the tunnel names the real client.
export const clientIp = (req: Request) => (req.headers["cf-connecting-ip"] as string | undefined) ?? req.ip ?? "unknown";

type Who = (req: Request) => string;
const byUser: Who = (req) => (req as Request & { user?: { id: string } }).user?.id ?? clientIp(req);

async function hit(key: string, start: Date) {
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO rate_limit_counters (key, window_start, count) VALUES (${key}, ${start}, 1)
    ON CONFLICT (key, window_start) DO UPDATE SET count = rate_limit_counters.count + 1
    RETURNING count`;
  // ponytail: sweep old windows on ~1% of hits; a scheduled job if the table ever grows large
  if (Math.random() < 0.01)
    void prisma.$executeRaw`DELETE FROM rate_limit_counters WHERE window_start < ${new Date(Date.now() - 86_400_000)}`.catch(() => {});
  return Number(rows[0]?.count ?? 0);
}

export function rateLimit(
  name: keyof typeof LIMITS,
  { who = byUser, message = "Too many requests. Wait a moment and try again." }: { who?: Who; message?: string } = {},
): RequestHandler {
  const { limit, windowMs } = LIMITS[name];
  return async (req, res, next) => {
    const now = Date.now();
    let count: number;
    try {
      count = await hit(`${name}:${who(req)}`, new Date(windowStart(now, windowMs)));
    } catch (err) {
      console.warn("rate limit unavailable:", (err as Error).message);
      return next();
    }
    if (count <= limit) return next();
    res.setHeader("Retry-After", String(retryAfterSeconds(now, windowMs)));
    res.status(429).json({ error: message });
  };
}

export const byIp: Who = clientIp;
