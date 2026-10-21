import { router } from "expo-router";
import { useEffect, useState } from "react";
import { BackHandler, StyleSheet, Text, View } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";

import { Button } from "@/components/button";
import { Screen } from "@/components/screen";
import { Working, type Step } from "@/components/working";
import { sessions, useSessions } from "@/hooks/use-sessions";
import { colors, fonts, lit, type } from "@/theme";
import { formatTime } from "@/utils/format-time";
import { riseIn } from "@/utils/motion";

const POLL_MS = 2500;

// What the server does while scoring (server/src/modules/scoring/application/sessions.ts); usually 5–20 s.
export const SCORING_STEPS: Step[] = [
  ["Reading your answers", 15],
  ["Checking them against your manuscript", 40],
  ["Scoring the rubric", 65],
  ["Writing your feedback", 88],
];
export const SCORING_MS = 15_000;

// Session complete (screen 12): a calm bridge while the server scores the session, then the report.
export function Scoring({ ms, answered }: { ms: number; answered: number }) {
  const { submit } = useSessions();
  const [failed, setFailed] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [since, setSince] = useState(Date.now); // scoring starts as the session is submitted
  const reduced = useReducedMotion();
  const id = submit.state === "saved" ? submit.id : null;
  const home = () => router.dismissAll();

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      home();
      return true;
    });
    return () => sub.remove();
  }, []);

  // Poll the saved session until it's scored.
  useEffect(() => {
    if (!id) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const s = await sessions.get(id);
        if (!alive) return;
        if (s.status === "ready") router.replace({ pathname: "/results", params: { id, from: "session" } });
        else if (s.status === "failed") setFailed(s.error ?? "We couldn't score this session.");
        else timer = setTimeout(tick, POLL_MS);
      } catch {
        if (alive) timer = setTimeout(tick, POLL_MS * 2);
      }
    };
    void tick();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [id, attempt]);

  const retry = async () => {
    setFailed("");
    setSince(Date.now());
    if (submit.state === "failed") return sessions.retrySubmit();
    if (id) {
      await sessions.rescore(id).catch(() => {});
      setAttempt((a) => a + 1);
    }
  };

  const problem = submit.state === "failed" ? `We couldn't save your session. ${submit.error}` : failed;

  return (
    <Screen>
      <Working
        title={"That's a wrap."}
        subtitle={problem || "The panel is writing up your notes."}
        since={since}
        expectedMs={SCORING_MS}
        steps={problem ? undefined : SCORING_STEPS}
      >
        <View style={styles.stats}>
          <Stat value={formatTime(ms)} label="session" />
          <Stat value={String(answered)} label="answered" />
        </View>
      </Working>
      {problem ? (
        <Animated.View entering={riseIn(0, reduced)} style={styles.retry}>
          <Button label="Try again" onPress={retry} />
        </Animated.View>
      ) : null}
      <View style={styles.home}>
        <Button variant="secondary" label="Back to home" onPress={home} />
      </View>
    </Screen>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={[type.meta, styles.statLabel]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: "row", gap: 8, marginTop: 18 },
  stat: { ...lit, backgroundColor: colors.sand, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 16 },
  statValue: { fontFamily: fonts.mono, fontWeight: "500", fontSize: 18, color: colors.ink },
  statLabel: { fontSize: 11.5, marginTop: 2 },
  retry: { marginTop: 16 },
  home: { marginTop: 8 },
});
