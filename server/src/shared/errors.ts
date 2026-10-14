import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

// An error the student sees as-is, with its HTTP status (and an optional code the app can branch on).
export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

// Gemini (or the backup chain) was rate-limited or overloaded; the work is kept, so trying later works.
export const BUSY = "The AI panel is busy right now. Try again in a few minutes.";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) return void res.status(err.status).json({ error: err.message, ...(err.code && { code: err.code }) });
  if (err instanceof ZodError) return void res.status(400).json({ error: err.issues[0]?.message ?? "Invalid request." });
  // express.json / express.raw failures (bad JSON, too large) carry their own 4xx status.
  const status = typeof err === "object" && err && "status" in err ? Number(err.status) : 0;
  if (status >= 400 && status < 500)
    return void res.status(status).json({ error: status === 413 ? "That's too large to send." : "Invalid request." });
  console.error(err);
  res.status(500).json({ error: "Something went wrong. Try again." });
};
