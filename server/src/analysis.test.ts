/// <reference types="bun" />
import { afterEach, expect, test } from "bun:test";

import { Busy, FLASH_MODELS, generateJson } from "./analysis";

const [m0, m1, m2] = FLASH_MODELS as [string, string, string, ...string[]];
const short = (m: string) => m.replace("models/", "");
const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

// Fake Gemini: each model answers with the given status (200 returns text).
function fake(statuses: Record<string, number>) {
  const calls: string[] = [];
  globalThis.fetch = (async (url: string) => {
    const model = FLASH_MODELS.find((m) => String(url).includes(m)) ?? "?";
    calls.push(model);
    const status = statuses[model] ?? 200;
    const body = status === 200 ? { candidates: [{ content: { parts: [{ text: `{"from":"${model}"}` }] } }] } : { error: { code: status } };
    return new Response(JSON.stringify(body), { status });
  }) as typeof fetch;
  return calls;
}

test("a rate-limited model hands the call to the next one", async () => {
  const calls = fake({ [m0]: 429 });
  const r = await generateJson({});
  expect(r.model).toBe(short(m1));
  expect(calls).toEqual([m0, m1]);
});

test("overloaded and retired models are skipped too", async () => {
  fake({ [m0]: 503, [m1]: 404 });
  expect((await generateJson({})).model).toBe(short(m2));
});

test("when every model is busy the caller gets Busy", async () => {
  fake(Object.fromEntries(FLASH_MODELS.map((m) => [m, 429])));
  expect(generateJson({})).rejects.toBeInstanceOf(Busy);
});

test("a bad key stops at the first model instead of trying them all", async () => {
  const calls = fake({ [m0]: 403 });
  const err = await generateJson({}).catch((e) => e);
  expect(err).toBeInstanceOf(Error);
  expect(err).not.toBeInstanceOf(Busy);
  expect(calls).toEqual([m0]);
});
