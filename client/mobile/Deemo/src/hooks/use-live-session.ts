import { useNetInfo } from "@react-native-community/netinfo";
import { useCallback, useEffect, useReducer, useRef } from "react";
import { AppState } from "react-native";

import { MockEngine } from "@/live/mock-engine";
import { canAsk, initialLiveState, liveReducer } from "@/live/reducer";
import type { LiveEngine } from "@/live/types";

const TICK_MS = 250;

// Runs one live session: engine events -> reducer, client-side timers, and the auto-pauses
// the brief asks for (app backgrounded, connection lost).
// ponytail: always the scripted MockEngine; the Gemini Live engine plugs in here next.
export function useLiveSession() {
  const [state, dispatch] = useReducer(liveReducer, initialLiveState);
  const stateRef = useRef(state);
  const engineRef = useRef<LiveEngine | null>(null);
  const userPaused = useRef(false);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const engine = new MockEngine();
    engineRef.current = engine;
    engine.start(dispatch, (q) => canAsk(stateRef.current, q)); // follow-up limit, enforced on device

    let last = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      dispatch({ type: "tick", ms: now - last });
      last = now;
    }, TICK_MS);

    return () => {
      clearInterval(id);
      engine.stop();
    };
  }, []);

  const pause = useCallback(() => {
    userPaused.current = true;
    dispatch({ type: "pause" });
    engineRef.current?.pause();
  }, []);

  const resume = useCallback(() => {
    userPaused.current = false;
    dispatch({ type: "resume" });
    if (!stateRef.current.reconnecting) engineRef.current?.resume();
  }, []);

  // Leaving the app pauses the session; the student resumes it themselves.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s !== "active" && !userPaused.current) pause();
    });
    return () => sub.remove();
  }, [pause]);

  // Connection drop: non-blocking "Reconnecting…" and an automatic pause until it's back.
  const net = useNetInfo();
  const offline = net.isConnected === false || net.isInternetReachable === false;
  useEffect(() => {
    dispatch({ type: "reconnecting", value: offline });
    if (offline) engineRef.current?.pause();
    else if (!userPaused.current) engineRef.current?.resume();
  }, [offline]);

  const finishTurn = useCallback(() => engineRef.current?.finishTurn(), []);
  const sendText = useCallback((text: string) => engineRef.current?.sendText(text), []);
  const stop = useCallback(() => engineRef.current?.stop(), []);

  return { state, finishTurn, sendText, pause, resume, stop };
}
