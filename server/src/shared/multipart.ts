import type { Request } from "express";

// A multipart upload (the app's FormData) read from express.raw's buffer. The file only lives in memory.
export async function readForm(req: Request) {
  return new Response(req.body, { headers: { "content-type": req.headers["content-type"] ?? "" } }).formData().catch(() => null);
}
