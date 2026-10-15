/// <reference types="bun" />
import { afterEach, expect, test } from "bun:test";

import { Busy, FLASH_MODELS, forModel, generateJson, type FlashRequest } from "./gemini";

const [m0, m1, m2] = FLASH_MODELS as [string, string, string, ...string[]];
const short = (m: string) => m.replace("models/", "");
const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

const req: FlashRequest = {
  contents: [{ role: "user", parts: [{ text: "Read this." }] }],
  generationConfig: { responseMimeType: "application/json", responseJsonSchema: { type: "object" } },
};

// Fake Gemini: each model answers with the given status (200 returns text). Models that answered 429/503 sit out for
// 5 minutes across tests, so each test only relies on fresh ones or on "every model is sitting out, try them all".
function fake(statuses: Record<string, number>) {
  const calls: string[] = [];
  globalThis.fetch = (async (url: string) => {
    const model = FLASH_MODELS.find((m) => String(url).includes(m)) ?? "?";
    calls.push(model);
    const status = statuses[model] ?? 200;
    const body = status !== 200 ? { error: { code: status } } : { candidates: [{ content: { parts: [{ text: `{"from":"${model}"}` }] } }] };
    return new Response(JSON.stringify(body), { status });
  }) as typeof fetch;
  return { calls };
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

test("a bad key stops at once instead of trying every model", async () => {
  const { calls } = fake({ [m0]: 403, [m1]: 403, [m2]: 403 }); // every model is sitting out by now: all would be tried
  const err = await generateJson(req).catch((e) => e);
  expect(err).not.toBeInstanceOf(Busy);
  expect(calls).toHaveLength(1);
});

test("the chain ends on Flash-Lite, and each model appears once", () => {
  expect(FLASH_MODELS.at(-1)).toContain("flash-lite");
  expect(new Set(FLASH_MODELS).size).toBe(FLASH_MODELS.length);
});

test("Flash-Lite thinks at medium unless the request sets a level; Flash is left alone", () => {
  const lite = FLASH_MODELS.find((m) => m.includes("flash-lite"))!;
  expect(forModel(lite, req).generationConfig.thinkingConfig).toEqual({ thinkingLevel: "medium" });
  expect(forModel(m0, req)).toBe(req);
  const low = { ...req, generationConfig: { ...req.generationConfig, thinkingConfig: { thinkingLevel: "low" } } };
  expect(forModel(lite, low)).toBe(low); // the rubric asks for low; keep it
});
