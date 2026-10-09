/// <reference types="bun" />
import { expect, test } from "bun:test";

import { MIN_SPEECH_LEVEL, isSpeech, levelOf, nextFloor } from "./mic-level";

const tone = (amp: number) => Float32Array.from({ length: 1600 }, (_, i) => amp * Math.sin(i / 5));

// Feeds 100 ms levels through the floor tracker; returns how many counted as speech.
function voicedFrames(levels: number[]) {
  let floor = 1;
  let n = 0;
  for (const l of levels) {
    floor = nextFloor(floor, l);
    if (isSpeech(l, floor)) n++;
  }
  return n;
}

test("silence and empty buffers read zero", () => {
  expect(levelOf(new Float32Array(0))).toBe(0);
  expect(levelOf(new Float32Array(1600))).toBe(0);
});

test("loud input clamps to 1", () => {
  expect(levelOf(tone(1))).toBe(1);
});

test("quiet room hiss never counts as speech", () => {
  expect(levelOf(tone(0.003))).toBeLessThan(MIN_SPEECH_LEVEL);
  expect(voicedFrames(Array(50).fill(levelOf(tone(0.003))))).toBe(0);
});

test("steady loud room noise (seen on device at ~0.4) does not pass the check", () => {
  const noise = Array.from({ length: 50 }, (_, i) => 0.4 + 0.03 * Math.sin(i));
  expect(voicedFrames(noise)).toBe(0);
});

test("speaking over that noise counts", () => {
  const noise = Array.from({ length: 20 }, (_, i) => 0.4 + 0.03 * Math.sin(i));
  const speech = Array.from({ length: 20 }, (_, i) => 0.65 + 0.1 * Math.sin(i * 1.7));
  expect(voicedFrames([...noise, ...speech])).toBeGreaterThanOrEqual(14); // most of it; the floor creeps up during long speech
});
