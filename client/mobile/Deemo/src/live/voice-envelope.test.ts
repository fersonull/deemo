import { expect, test } from "bun:test";

import { envelope, rms, voiceTarget, VOICE_FLOOR } from "./voice-envelope";

test("quiet stays shut, loud opens fully, values stay in 0..1", () => {
  expect(voiceTarget(0)).toBe(0);
  expect(voiceTarget(VOICE_FLOOR)).toBe(0);
  expect(voiceTarget(NaN)).toBe(0);
  expect(voiceTarget(0.5)).toBe(1);
  expect(voiceTarget(0.08)).toBeGreaterThan(0.3);
});

test("opens fast and closes slower, then snaps shut", () => {
  const opened = envelope(0, 0.2);
  expect(opened).toBeGreaterThan(0.6); // one frame of a syllable
  const after = envelope(opened, 0);
  expect(after).toBeGreaterThan(0.4); // doesn't flutter shut between syllables
  let v = after;
  for (let i = 0; i < 30; i++) v = envelope(v, 0);
  expect(v).toBe(0);
});

test("rms of a frame", () => {
  expect(rms(new Float32Array([0.5, -0.5, 0.5, -0.5]))).toBeCloseTo(0.5);
  expect(rms(new Float32Array(0))).toBe(0);
});
