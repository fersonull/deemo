import { resolve } from "node:path";
import { defineConfig, type Connect, type Plugin } from "vite";

// /privacy is its own page (privacy/index.html). Vercel serves it from that path (vercel.json cleanUrls); the dev and
// preview servers need the slash-less URL pointed at the folder, or they fall back to the home page.
const pages = ["/privacy"];
const cleanUrls: Plugin = {
  name: "clean-urls",
  configureServer: (server) => void server.middlewares.use(rewrite),
  configurePreviewServer: (server) => void server.middlewares.use(rewrite),
};
function rewrite(req: Connect.IncomingMessage, _res: unknown, next: () => void) {
  const path = req.url?.split("?")[0];
  if (path && pages.includes(path)) req.url = req.url!.replace(path, `${path}/`);
  next();
}

// DEEMO's public site: the landing page plus the privacy page, no framework. three.js loads lazily after first paint
// as its own chunk (src/main.ts → src/hero/stack.ts).
export default defineConfig({
  server: { port: 5056 },
  plugins: [cleanUrls],
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 700,
    rollupOptions: { input: { main: resolve(__dirname, "index.html"), privacy: resolve(__dirname, "privacy/index.html") } },
  },
});
