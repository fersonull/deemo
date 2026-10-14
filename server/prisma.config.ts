import { defineConfig } from "prisma/config";

// Prisma ORM 7 (pinned; 8 changes the whole toolchain). Bun loads server/.env, so run the CLI under Bun:
// `bunx --bun prisma migrate dev`. DATABASE_URL is read directly (not env()) so `prisma generate` works without it.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env.DATABASE_URL ?? "" },
});
