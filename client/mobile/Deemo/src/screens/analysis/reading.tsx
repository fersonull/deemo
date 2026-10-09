import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";

import { Blob } from "@/components/blob";
import { Icon } from "@/components/icon";
import { colors, fonts, type } from "@/theme";

// Progress is an estimate: the server answers "analyzing" until it's done, and a manuscript takes ~30–60 s.
const EXPECTED_MS = 50_000;
const STEPS = [
  ["Reading your chapters", 15],
  ["Finding your objectives", 40],
  ["Mapping the methodology", 65],
  ["Checking scope and limits", 90],
] as const;

// "Your panel is reading." (prototype analysis screen, analyzing state).
export function Reading({ since }: { since: string }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 400);
    return () => clearInterval(t);
  }, []);
  const pct = Math.min(95, Math.max(3, ((now - Date.parse(since)) / EXPECTED_MS) * 100));
  const lit = Math.floor(now / 400) % 3;

  const breath = useSharedValue(1);
  useEffect(() => {
    breath.value = withRepeat(withTiming(1.05, { duration: 1600, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [breath]);
  const breathing = useAnimatedStyle(() => ({ transform: [{ scale: breath.value }] }));

  return (
    <View style={styles.wrap} accessibilityLiveRegion="polite">
      <View style={styles.art}>
        <Animated.View style={breathing}>
          <Blob width={110} height={96}>
            <View style={styles.dots}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={[styles.dot, { opacity: i === lit ? 1 : 0.45 }]} />
              ))}
            </View>
          </Blob>
        </Animated.View>
      </View>
      <Text accessibilityRole="header" style={styles.title}>
        {"Your panel is\nreading."}
      </Text>
      <Text style={styles.sub}>This usually takes 30 to 60 seconds.</Text>
      <View style={styles.steps}>
        {STEPS.map(([label, at]) => {
          const done = pct >= at;
          return (
            <View key={label} style={[styles.step, { opacity: pct >= at - 15 ? 1 : 0.35 }]}>
              <Icon name={done ? "check_circle" : "radio_button_unchecked"} size={20} color={done ? colors.sage : colors.muted} />
              <Text style={styles.stepText}>{label}</Text>
            </View>
          );
        })}
      </View>
      <View style={styles.flex} />
      <View
        style={styles.track}
        accessible
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}
      >
        <View style={[styles.bar, { width: `${pct}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingTop: 6 },
  flex: { flex: 1 },
  art: { height: 140, justifyContent: "center" },
  dots: { flexDirection: "row", gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.paper },
  title: { ...type.title, marginTop: 12 },
  sub: { ...type.body, color: colors.inkMuted, marginTop: 10 },
  steps: { gap: 12, marginTop: 26 },
  step: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepText: { fontFamily: fonts.body, fontWeight: "500", fontSize: 14.5, color: colors.ink },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.sand, overflow: "hidden" },
  bar: { height: "100%", borderRadius: 4, backgroundColor: colors.dusk },
});
