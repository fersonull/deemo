import { defineConfig } from "vite";

// DEEMO's public marketing site: a single static page, no framework (see docs/DEEMO_SITE_PLAN.md — same category as
// client/web/presentation, which stayed framework-free for the same reason: a motion-heavy page with nothing to
// operate, nothing a router or component tree would help).
export default defineConfig({
  server: { port: 5056 },
  build: { target: "es2022" },
});
