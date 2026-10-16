/// <reference types="bun" />
import { expect, mock, test } from "bun:test";

import { canAsk, initialLiveState, liveReducer } from "./reducer";
import type { LiveEvent, LiveState } from "./types";

// The mouth level is UI-thread state (Reanimated); a plain object stands in for it here.
mock.module("./voice-level", () => ({ panelVoice: { value: 0 } }));
const { MockEngine } = await import("./mock-engine");

// Drives the mock by hand (no real timers) and taps "done" whenever the simulated student stops talking.
test("the scripted defense runs start to finish through the reducer", () => {
  const engine = new MockEngine();
  let s: LiveState = initialLiveState;
  let studentDone = false;
  engine.start(
    (e: LiveEvent) => {
      s = liveReducer(s, e);
      if (e.type === "level" && e.value === 0.05) studentDone = true;
    },
    (q) => canAsk(s, q),
  );
  clearInterval((engine as unknown as { timer: ReturnType<typeof setInterval> }).timer); // tick manually below
  const tick = (engine as unknown as { tick: () => void }).tick.bind(engine);

  for (let i = 0; i < 5000 && s.phase !== "ended"; i++) {
    tick();
    if (studentDone) {
      studentDone = false;
      engine.finishTurn();
    }
  }

  expect(s.phase).toBe("ended");
  expect(s.turns.map((t) => t.question.number)).toEqual([1, 2, 2, 3]);
  expect(s.turns[2].question.followUp).toBe(1);
  expect(s.turns.every((t) => t.latencyMs !== null)).toBe(true);
  expect(s.flags).toHaveLength(1);
  expect(s.lines.at(-1)).toEqual({ who: 0, text: "Thank you, that concludes our questions for today." });
});

test("pausing freezes the panel", () => {
  const engine = new MockEngine();
  const events: LiveEvent[] = [];
  engine.start((e) => events.push(e), () => true);
  clearInterval((engine as unknown as { timer: ReturnType<typeof setInterval> }).timer);
  const tick = (engine as unknown as { tick: () => void }).tick.bind(engine);
  engine.pause();
  for (let i = 0; i < 100; i++) tick();
  expect(events).toHaveLength(0);
  engine.resume();
  for (let i = 0; i < 20; i++) tick();
  expect(events[0]).toEqual({ type: "connected" });
});

test("time expiry cancels pending questions and finishes with one closing", () => {
  const engine = new MockEngine();
  const events: LiveEvent[] = [];
  engine.start((e) => events.push(e), () => true);
  clearInterval((engine as unknown as { timer: ReturnType<typeof setInterval> }).timer);
  const tick = (engine as unknown as { tick: () => void }).tick.bind(engine);
  engine.endForTime();
  engine.endForTime();
  for (let i = 0; i < 100; i++) tick();
  expect(events.filter((e) => e.type === "end")).toEqual([{ type: "end", reason: "time" }]);
  expect(events.filter((e) => e.type === "ended")).toHaveLength(1);
  expect(events.some((e) => e.type === "ask" || e.type === "youText")).toBe(false);
  engine.stop();
});
