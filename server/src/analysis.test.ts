/// <reference types="bun" />
import { afterEach, expect, test } from "bun:test";

import { Busy, FLASH_MODELS, generateJson, toOpenAI, type FlashRequest } from "./analysis";

const [m0, m1, m2] = FLASH_MODELS as [string, string, string, ...string[]];
const short = (m: string) => m.replace("models/", "");
const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
  delete process.env.OPENAI_API_KEY;
});

const req: FlashRequest = {
  contents: [{ role: "user", parts: [{ text: "Read this." }] }],
  generationConfig: { responseMimeType: "application/json", responseJsonSchema: { type: "object" } },
};

// Fake Gemini and OpenAI: each model answers with the given status (200 returns text). "openai" covers OpenAI.
// Models that answered 429/503 sit out for 5 minutes across tests, so each test only relies on fresh ones or on
// "every model is sitting out, try them all".
function fake(statuses: Record<string, number>) {
  const calls: string[] = [];
  const bodies: Record<string, unknown>[] = [];
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    const openai = String(url).includes("api.openai.com");
    const model = openai ? "openai" : (FLASH_MODELS.find((m) => String(url).includes(m)) ?? "?");
    calls.push(model);
    bodies.push(JSON.parse(String(init.body)));
    const status = statuses[model] ?? 200;
    const text = `{"from":"${model}"}`;
    const body =
      status !== 200
        ? { error: { code: status } }
        : openai
          ? { output: [{ type: "reasoning" }, { type: "message", content: [{ type: "output_text", text }] }] }
          : { candidates: [{ content: { parts: [{ text }] } }] };
    return new Response(JSON.stringify(body), { status });
  }) as typeof fetch;
  return { calls, bodies };
}

test("a rate-limited model hands the call to the next one", async () => {
  const { calls } = fake({ [m0]: 429 });
  const r = await generateJson(req);
  expect(r.model).toBe(short(m1));
  expect(calls).toEqual([m0, m1]);
});

test("overloaded and retired models are skipped too", async () => {
  fake({ [m0]: 503, [m1]: 404 });
  expect((await generateJson(req)).model).toBe(short(m2));
});

test("a model that just said it's busy sits out the next call", async () => {
  const { calls } = fake({});
  await generateJson(req);
  expect(calls[0]).not.toBe(m0); // m0 answered 429 and 503 above
});

test("when every model is busy the caller gets Busy", async () => {
  fake(Object.fromEntries(FLASH_MODELS.map((m) => [m, 429])));
  expect(generateJson(req)).rejects.toBeInstanceOf(Busy);
});

test("OpenAI takes over only for students who agreed to it", async () => {
  process.env.OPENAI_API_KEY = "test";
  const busy = Object.fromEntries(FLASH_MODELS.map((m) => [m, 503]));
  fake(busy);
  expect(generateJson(req)).rejects.toBeInstanceOf(Busy); // no backup consent
  const { calls } = fake(busy);
  const r = await generateJson(req, { backup: true });
  expect(r).toEqual({ text: '{"from":"openai"}', model: "openai/gpt-6-luna" });
  expect(calls.at(-1)).toBe("openai");
});

test("a bad key skips the rest of that provider, not the backup", async () => {
  process.env.OPENAI_API_KEY = "test";
  fake({ [m0]: 403, [m1]: 403, [m2]: 403 });
  expect((await generateJson(req, { backup: true })).model).toBe("openai/gpt-6-luna");
  const { calls: only } = fake({ [m0]: 403, [m1]: 403, [m2]: 403 }); // every Gemini model is sitting out: all tried
  const err = await generateJson(req).catch((e) => e);
  expect(err).not.toBeInstanceOf(Busy);
  expect(only).toHaveLength(1);
});

test("the OpenAI request carries the same file, photo, prompt and schema", () => {
  const body = toOpenAI("gpt-x", {
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: "application/pdf", data: "UERG" } },
          { inlineData: { mimeType: "image/png", data: "iVBO" } },
          { text: "Prompt" },
        ],
      },
    ],
    generationConfig: { responseJsonSchema: { type: "object" }, thinkingConfig: { thinkingLevel: "low" }, temperature: 0 },
  });
  expect(body).toMatchObject({
    model: "gpt-x",
    input: [
      {
        role: "user",
        content: [
          { type: "input_file", filename: "document.pdf", file_data: "data:application/pdf;base64,UERG" },
          { type: "input_image", image_url: "data:image/png;base64,iVBO" },
          { type: "input_text", text: "Prompt" },
        ],
      },
    ],
    text: { format: { type: "json_schema", name: "result", schema: { type: "object" } } },
    reasoning: { effort: "low" },
    store: false,
  });
});
