import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import { AudioManager } from "react-native-audio-api";

import { isSpeech, levelOf, nextFloor } from "@/utils/mic-level";
import { rememberRoomFloor } from "@/utils/noise-gate";
import { getRecorder } from "@/utils/recorder";

const BARS = 22;
const SAMPLE_RATE = 16000; // Live API input rate (addendum B6)

type Status = "asking" | "listening" | "denied" | "error";

// Streams mic levels while the screen is focused. Buffers are only measured, never stored.
export function useMicCheck() {
  const [status, setStatus] = useState<Status>("asking");
  const [levels, setLevels] = useState<number[]>(() => Array(BARS).fill(0));
  const [voicedMs, setVoicedMs] = useState(0);
  const [attempt, setAttempt] = useState(0);

  // Coming back from system settings after a denial: ask again.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active" && status === "denied") setAttempt((a) => a + 1);
    });
    return () => sub.remove();
  }, [status]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const r = getRecorder();
      let floor = 1; // first reading sets it

      r.onAudioReady({ sampleRate: SAMPLE_RATE, bufferLength: SAMPLE_RATE / 10, channelCount: 1 }, ({ buffer, numFrames }) => {
        const level = levelOf(buffer.getChannelData(0));
        floor = nextFloor(floor, level);
        rememberRoomFloor(floor); // the session's noise gate starts from this room's level
        setLevels((l) => [...l.slice(1), level]);
        if (isSpeech(level, floor)) setVoicedMs((ms) => ms + (numFrames / buffer.sampleRate) * 1000);
      });

      (async () => {
        const permission = await AudioManager.requestRecordingPermissions();
        if (!active) return;
        if (permission !== "Granted") return setStatus("denied");
        const result = await r.start();
        if (!active) return void r.stop();
        setStatus(result.status === "success" ? "listening" : "error");
      })();

      return () => {
        active = false;
        r.clearOnAudioReady();
        r.stop();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps -- attempt restarts the mic after a settings round-trip
    }, [attempt]),
  );

  return { status, levels, voicedMs };
}
