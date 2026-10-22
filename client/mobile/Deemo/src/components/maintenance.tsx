import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { Blob } from "@/components/blob";
import { Button } from "@/components/button";
import { Deemo } from "@/components/deemo";
import { Icon } from "@/components/icon";
import { colors, fonts, radius, space, type } from "@/theme";
import { maintenance, useMaintenance } from "@/utils/maintenance";
import { riseIn } from "@/utils/motion";

const EVERY = 30; // seconds between automatic checks
const FALLBACK = "DEEMO is getting an update. Try again in a little while; your sessions are safe.";

// The whole app while maintenance is on (web admin switch): Deemo reading on a dusk blob, the admin's message, and a
// countdown to the next automatic check. It disappears by itself once the server says maintenance is over; "Check
// now" asks straight away. Drawn over the navigator by the root layout, so the student lands back where they were.
export function Maintenance() {
  const { message } = useMaintenance();
  const reduced = useReducedMotion();
  const [left, setLeft] = useState(EVERY);
  const [busy, setBusy] = useState(false);
  const [tries, setTries] = useState(0);

  const check = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const [still] = await Promise.all([maintenance.check(), new Promise((r) => setTimeout(r, 500))]);
      if (still) setTries((n) => n + 1); // still closed: Deemo shakes its head and goes back to reading
    } finally {
      setBusy(false);
      setLeft(EVERY);
    }
  };

  // One tick a second: the countdown, and a check when it runs out.
  useEffect(() => {
    const id = setInterval(() => setLeft((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (left === 0) void maintenance.check().then(() => setLeft(EVERY));
  }, [left]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.art} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Animated.View entering={FadeIn.duration(300)} style={styles.stage}>
          <Blob width={280} height={250} color={colors.duskTint} style={styles.blob} />
          <Deemo key={tries} size="xl" mood="reading" startle={tries > 0} />
        </Animated.View>
      </View>
      <Animated.View entering={riseIn(80, reduced)} style={styles.words} accessibilityLiveRegion="polite">
        <View style={styles.chip}>
          <Icon name="construction" size={16} color={colors.duskInk} />
          <Text style={styles.chipText}>MAINTENANCE</Text>
        </View>
        <Text accessibilityRole="header" style={styles.title}>
          {"The panel is on\na short break."}
        </Text>
        <Text style={styles.body}>{message || FALLBACK}</Text>
        <View style={styles.status}>
          <View style={styles.dot} />
          <Text style={styles.statusText}>
            {busy ? "Checking…" : `Checking again in 0:${String(left).padStart(2, "0")}`}
          </Text>
        </View>
        <Button label="Check now" variant="secondary" onPress={check} busy={busy} />
        <Text style={styles.meta}>Your manuscripts, sessions and reports are safe.</Text>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { ...StyleSheet.absoluteFill, backgroundColor: colors.paper, paddingHorizontal: space.gutter },
  art: { flex: 1, alignItems: "center", justifyContent: "center" },
  stage: { alignItems: "center", justifyContent: "center" },
  blob: { position: "absolute" },
  words: { paddingBottom: space.xl },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: space.xs,
    backgroundColor: colors.duskTint,
    borderRadius: radius.sm,
    paddingVertical: space.xs,
    paddingHorizontal: space.sm,
    marginBottom: space.md,
  },
  chipText: { ...type.label, color: colors.duskInk },
  title: { ...type.hero },
  body: { ...type.body, fontSize: 15, lineHeight: 22, color: colors.inkMuted, marginTop: space.sm },
  status: { flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: space.xl, marginBottom: space.md },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.dusk },
  statusText: { fontFamily: fonts.mono, fontWeight: "500", fontSize: 13, fontVariant: ["tabular-nums"], color: colors.inkMuted },
  meta: { ...type.meta, textAlign: "center", marginTop: space.md },
});
