/// <reference types="bun" />
import { expect, test } from "bun:test";

import { HOLD_CHUNKS, createNoiseGate, rememberRoomFloor } from "./noise-gate";

const chunk = (amp: number) => Float32Array.from({ length: 1600 }, (_, i) => amp * Math.sin(i / 5));
type Out = { samples: Float32Array; voiced: boolean } | null;
const silent = (c: Out) => !!c && !c.voiced && c.samples.every((v) => v === 0);

// Feeds chunks through the gate; returns "S" for each chunk sent as silence, "V" for each passed through.
function run(amps: number[]) {
  const gate = createNoiseGate();
  const sent = [...amps.map((a) => gate.push(chunk(a)).out), gate.flush()].filter((c) => c !== null);
  return sent.map((c) => (silent(c) ? "S" : "V")).join("");
}

test("room noise is sent as silence", () => {
  expect(run(Array(30).fill(0.003))).toBe("S".repeat(30)); // ≈ -50 dBFS hum
});

test("speech passes, with one chunk of lead-in and a hold after it", () => {
  const amps = [...Array(10).fill(0.003), ...Array(5).fill(0.1), ...Array(15).fill(0.003)];
  const expected = "S".repeat(9) + "V" + "V".repeat(5) + "V".repeat(HOLD_CHUNKS) + "S".repeat(15 - HOLD_CHUNKS);
  expect(run(amps)).toBe(expected);
});

test("in a noisy room, quieter chatter stays out and the student's voice gets through", () => {
  rememberRoomFloor(0.46); // mic check measured a loud room (≈ -37 dBFS)
  const room = Array(10).fill(0.02); // same room
  const chatter = Array(10).fill(0.03); // voices across the room, a little above it
  const student = Array(5).fill(0.1); // close to the phone
  expect(run([...room, ...chatter])).not.toContain("V");
  expect(run([...room, ...student])).toContain("VVVVV");
  rememberRoomFloor(0.25);
});

test("a long unbroken answer isn't gated as the floor adapts", () => {
  expect(run([...Array(5).fill(0.003), ...Array(600).fill(0.1)]).slice(5, 605)).toBe("V".repeat(600)); // a minute of speech
});

test("flush returns the held-back last chunk and resets the hold", () => {
  const gate = createNoiseGate();
  gate.push(chunk(0.003));
  gate.push(chunk(0.1));
  expect(silent(gate.flush())).toBe(false);
  expect(gate.flush()).toBeNull();
});
