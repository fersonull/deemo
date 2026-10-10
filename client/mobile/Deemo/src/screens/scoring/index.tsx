import { router } from "expo-router";
import { useEffect, useState } from "react";
import { BackHandler, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";

import { Blob } from "@/components/blob";
import { Button } from "@/components/button";
import { Screen } from "@/components/screen";
import { sessions, useSessions } from "@/hooks/use-sessions";
import { colors, fonts, type } from "@/theme";
import { formatTime } from "@/utils/format-time";

const POLL_MS = 2500;

// Session complete (screen 12): a calm bridge while the server scores the session, then the report.
export function Scoring({ ms, answered }: { ms: number; answered: number }) {
  const { submit } = useSessions();
  const [failed, setFailed] = useState("");
  const [attempt, setAttempt] = useState(0);
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
    if (submit.state === "failed") return sessions.retrySubmit();
    if (id) {
      await sessions.rescore(id).catch(() => {});
      setAttempt((a) => a + 1);
    }
  };

  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 2400 }), -1, true);
  }, [t]);
  const breathe = useAnimatedStyle(() => ({ transform: [{ scale: 1 + 0.06 * t.value }] }));

  const problem = submit.state === "failed" ? `We couldn't save your session. ${submit.error}` : failed;

  return (
    <Screen>
      <View style={styles.center}>
        <Animated.View style={breathe}>
          <Blob width={110} height={96}>
            <View style={styles.dots}>
              {[0.6, 1, 0.6].map((o, i) => (
                <View key={i} style={[styles.dot, { opacity: o }]} />
              ))}
            </View>
          </Blob>
        </Animated.View>
        <Text style={[type.title, styles.title]} accessibilityRole="header">
          {"That's a wrap."}
        </Text>
        <Text style={styles.body} accessibilityLiveRegion="polite">
          {problem || "The panel is writing up your notes."}
        </Text>
        <View style={styles.stats}>
          <Stat value={formatTime(ms)} label="session" />
          <Stat value={String(answered)} label="answered" />
        </View>
      </View>
      {problem ? (
        <View style={styles.retry}>
          <Button label="Try again" onPress={retry} />
        </View>
      ) : null}
      <Button variant="secondary" label="Back to home" onPress={home} />
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
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  dots: { flexDirection: "row", gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.paper },
  title: { marginTop: 28, fontSize: 30, lineHeight: 32 },
  body: { ...type.body, color: colors.inkMuted, textAlign: "center", marginTop: 8 },
  stats: { flexDirection: "row", gap: 8, marginTop: 26 },
  stat: { backgroundColor: colors.sand, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 16 },
  statValue: { fontFamily: fonts.mono, fontWeight: "500", fontSize: 18, color: colors.ink },
  statLabel: { fontSize: 11.5, marginTop: 2 },
  retry: { marginBottom: 8 },
});
