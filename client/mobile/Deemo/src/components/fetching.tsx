import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { Blob } from "@/components/blob";
import { colors, radius, type } from "@/theme";

const LINES = ["78%", "92%", "60%"] as const;

// Opening something that already exists (a report from Recent, a manuscript summary): a page floats up out of the
// panel's blob while its lines fill in. Fades in after a beat, so a quick load never flashes it.
// Waits for new work (reading a manuscript, scoring) use Working instead.
export function Fetching({ title, subtitle }: { title: string; subtitle: string }) {
  const reduced = useReducedMotion();
  const [lit, setLit] = useState(0);
  const lift = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    lift.value = withRepeat(withTiming(-5, { duration: 1400, easing: Easing.inOut(Easing.sin) }), -1, true);
    const t = setInterval(() => setLit((i) => (i + 1) % LINES.length), 450);
    return () => clearInterval(t);
  }, [lift, reduced]);
  const floating = useAnimatedStyle(() => ({ transform: [{ translateY: lift.value }] }));

  return (
    <Animated.View entering={FadeIn.delay(300).duration(200)} style={styles.wrap} accessibilityLiveRegion="polite">
      <View style={styles.art}>
        <Blob width={120} height={104} color={colors.duskTint}>
          <Animated.View style={[styles.page, floating]}>
            <View style={styles.pageHead} />
            {LINES.map((w, i) => (
              <View key={i} style={[styles.line, { width: w, opacity: reduced || i === lit ? 1 : 0.4 }]} />
            ))}
          </Animated.View>
        </Blob>
      </View>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <Text style={styles.sub}>{subtitle}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingTop: 6 },
  art: { height: 140, justifyContent: "center" },
  page: {
    width: 56,
    height: 68,
    borderRadius: radius.md,
    backgroundColor: colors.paper,
    padding: 9,
    gap: 6,
    marginTop: 10,
  },
  pageHead: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.dusk, marginBottom: 2 },
  line: { height: 5, borderRadius: 3, backgroundColor: colors.duskSoft },
  title: { ...type.title, marginTop: 12 },
  sub: { ...type.body, color: colors.inkMuted, marginTop: 10 },
});
