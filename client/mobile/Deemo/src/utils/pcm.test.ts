/// <reference types="bun" />
import { expect, test } from "bun:test";

import { decodePcm16, encodePcm16, fromBase64, toBase64, utf8 } from "./pcm";

test("base64 matches the platform codec for every padding length", () => {
  for (const n of [0, 1, 2, 3, 4, 5, 3200]) {
    const bytes = Uint8Array.from({ length: n }, (_, i) => (i * 37 + 11) & 255);
    const b64 = toBase64(bytes);
    expect(b64).toBe(Buffer.from(bytes).toString("base64"));
    expect(fromBase64(b64)).toEqual(bytes);
  }
});

test("pcm16 round-trips within one quantization step", () => {
  const samples = Float32Array.from([0, 0.5, -0.5, 1, -1, 1.7, -2]);
  const back = decodePcm16(encodePcm16(samples));
  const clipped = samples.map((v) => Math.max(-1, Math.min(1, v)));
  back.forEach((v, i) => expect(Math.abs(v - clipped[i])).toBeLessThan(1 / 16384));
  expect(Buffer.from(fromBase64(encodePcm16(Float32Array.from([0.5])))).readInt16LE(0)).toBe(16383); // little-endian
});

test("utf8 decodes ASCII runs and multi-byte characters", () => {
  const s = `{"text":"Rizal’s café — 30 respondents 👍"}` + "x".repeat(10000);
  expect(utf8(new TextEncoder().encode(s))).toBe(s);
});
