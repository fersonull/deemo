import { z } from "zod";

// The server's environment, checked once at startup so a missing setting fails fast with a clear message.
// Bun loads server/.env automatically (see server/.env.example).
const Env = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is not set. Add the Prisma Postgres connection string to server/.env."),
  FIREBASE_SERVICE_ACCOUNT: z
    .string()
    .min(1, "FIREBASE_SERVICE_ACCOUNT is not set. Add the service-account key path to server/.env."),
  GEMINI_API_KEY: z.string().default(""),
  PORT: z.coerce.number().int().positive().default(3000),
  // Web origins allowed to call /admin from a browser (the Vercel admin), comma-separated. Local dev is always allowed.
  ADMIN_ORIGINS: z
    .string()
    .default("")
    .transform((s) => [...s.split(",").map((o) => o.trim()).filter(Boolean), "http://localhost:3001"]),
});

const parsed = Env.safeParse(process.env);
if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join("\n"));

export const config = parsed.data;
