import type { ZodType, z } from "zod";

// Gemini Flash for analysis, rubric reading and scoring (addendum B3), shared by the modules that read with AI.
// Models best first; the next one takes over when one is rate-limited, over quota or unavailable. Flash first for
// accuracy, then Flash-Lite, which is rarely busy when Flash is (GitHub #2). Only distinct models: gemini-3.7-flash and
// gemini-3.5-flash now just route to 3.8 and 3.6 (ai.google.dev/gemini-api/docs/models, Oct 2026). Model names change
// often; check that page before changing this list.
export const FLASH_MODELS = [
  "models/gemini-3.8-flash",
  "models/gemini-3.6-flash",
  "models/gemini-3.5-flash-lite",
  "models/gemini-3.1-flash-lite", // shuts down 2027-05-07
];

// Every Flash model in the chain was rate-limited, over quota or unavailable.
export class Busy extends Error {}

// A model answered, but not with the shape we asked for.
export class BadReply extends Error {}

export type Part = { text?: string; inlineData?: { mimeType: string; data: string }; fileData?: { mimeType: string; fileUri: string } };
export type FlashRequest = {
  contents: { role: string; parts: Part[] }[];
  generationConfig: { responseJsonSchema?: object; thinkingConfig?: { thinkingLevel?: string } } & Record<string, unknown>;
};
type GeminiReply = { candidates?: { content?: { parts?: { text?: string }[] } }[] };

// Flash-Lite thinks at "minimal" unless told otherwise; Google suggests more thinking for accuracy, so a request that
// doesn't set a level gets "medium" there. Flash's own default is already medium.
export const forModel = (model: string, req: FlashRequest): FlashRequest =>
  model.includes("flash-lite") && !req.generationConfig.thinkingConfig?.thinkingLevel
    ? { ...req, generationConfig: { ...req.generationConfig, thinkingConfig: { thinkingLevel: "medium" } } }
    : req;

// One Flash call: the first model that answers wins, in FLASH_MODELS order. A rate limit, quota cap (each model has its
// own), overload, hang or retired model moves on to the next one; a bad key stops at once. A model that just timed out
// or said it's busy sits out for a few minutes, so the next request doesn't wait on it again. If every model is sitting
// out, all are tried anyway.
const COOLDOWN_MS = 5 * 60_000;
const coolingUntil = new Map<string, number>();

export async function generateJson(req: FlashRequest, { timeoutMs = 120_000 } = {}): Promise<{ text: string; model: string }> {
  let busy = false;
  let last = "";
  const now = Date.now();
  const ready = FLASH_MODELS.filter((m) => (coolingUntil.get(m) ?? 0) <= now);
  const coolDown = (m: string) => coolingUntil.set(m, Date.now() + COOLDOWN_MS);
  for (const model of ready.length ? ready : FLASH_MODELS) {
    const id = model.replace("models/", "");
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/${model}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": process.env.GEMINI_API_KEY ?? "", "content-type": "application/json" },
      body: JSON.stringify(forModel(model, req)),
      signal: AbortSignal.timeout(timeoutMs),
    }).catch((err: Error) => err);
    if (r instanceof Error) {
      // A hung or dropped request (seen under high demand) would otherwise block the upload or the report.
      last = `${id}: ${r.name === "TimeoutError" ? "timed out" : r.message}`;
      busy = true;
      coolDown(model);
      console.warn("flash fallback:", last);
      continue;
    }
    if (r.ok) {
      const json = (await r.json()) as GeminiReply;
      const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
      if (text) return { text, model: id };
      last = `${id}: empty response`;
      continue;
    }
    last = `${id} ${r.status}: ${(await r.text()).slice(0, 200)}`;
    if (r.status === 401 || r.status === 403) break; // the key is the problem; every other model would fail too
    if (r.status === 429 || r.status === 503) {
      busy = true;
      coolDown(model);
    }
    console.warn("flash fallback:", last);
  }
  throw busy ? new Busy(last) : new Error(last);
}

// generateJson, with the reply checked against a zod schema: a malformed AI reply becomes BadReply ("try again")
// instead of bad data in the database.
export async function generateObject<S extends ZodType>(
  req: FlashRequest,
  schema: S,
  opts?: { timeoutMs?: number },
): Promise<{ value: z.output<S>; model: string }> {
  const { text, model } = await generateJson(req, opts);
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new BadReply(`${model}: not JSON`);
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) throw new BadReply(`${model}: ${parsed.error.issues[0]?.message ?? "unexpected shape"}`);
  return { value: parsed.data, model };
}

// A big file (a manuscript PDF, up to 50 MB) goes up once through the Files API, so a fallback model points at the same
// copy instead of re-sending ~67 MB of base64, and a slow upload doesn't count against a model's timeout. Delete it as
// soon as the reading is done: raw manuscripts aren't kept (Google would drop it after 48 h anyway).
const API = "https://generativelanguage.googleapis.com";
const key = () => ({ "x-goog-api-key": process.env.GEMINI_API_KEY ?? "" });

export async function uploadFile(bytes: Uint8Array, mimeType: string): Promise<{ name: string; uri: string }> {
  const start = await fetch(`${API}/upload/v1beta/files`, {
    method: "POST",
    headers: {
      ...key(),
      "x-goog-upload-protocol": "resumable",
      "x-goog-upload-command": "start",
      "x-goog-upload-header-content-length": String(bytes.length),
      "x-goog-upload-header-content-type": mimeType,
      "content-type": "application/json",
    },
    body: JSON.stringify({ file: { display_name: "manuscript" } }),
    signal: AbortSignal.timeout(30_000),
  });
  const url = start.headers.get("x-goog-upload-url");
  if (!start.ok || !url) throw new Error(`file upload start ${start.status}: ${(await start.text()).slice(0, 200)}`);
  const done = await fetch(url, {
    method: "POST",
    headers: { "x-goog-upload-offset": "0", "x-goog-upload-command": "upload, finalize" },
    body: bytes,
    signal: AbortSignal.timeout(10 * 60_000),
  });
  if (!done.ok) throw new Error(`file upload ${done.status}: ${(await done.text()).slice(0, 200)}`);
  let file = ((await done.json()) as { file: GeminiFile }).file;
  // A PDF is processed before it can be used; usually seconds.
  for (let i = 0; file.state === "PROCESSING" && i < 60; i++) {
    await Bun.sleep(2_000);
    file = (await (await fetch(`${API}/v1beta/${file.name}`, { headers: key() })).json()) as GeminiFile;
  }
  if (file.state !== "ACTIVE") {
    void deleteFile(file.name);
    throw new Error(`file ${file.state}`);
  }
  return { name: file.name, uri: file.uri };
}
type GeminiFile = { name: string; uri: string; state?: "PROCESSING" | "ACTIVE" | "FAILED" };

export const deleteFile = (name: string) =>
  fetch(`${API}/v1beta/${name}`, { method: "DELETE", headers: key() }).then(
    (r) => void (r.ok || console.warn("file delete", name, r.status)),
    (e: Error) => console.warn("file delete", name, e.message),
  );
