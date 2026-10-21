import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";

import { PanelFace } from "@/components/panel-face";
import { PANEL, panelLabel, type Course } from "@/constants";
import { colors, fonts } from "@/theme";

export type PanelistStatus = "speaking" | "listening" | "thinking" | "skeptical" | "offline";

const STATUS = { speaking: "Speaking", listening: "Listening", thinking: "Thinking…", skeptical: "Listening", offline: "Joining…" };

// One panelist in the live session: their face (components/panel-face) with its mood, name, role and status.
// `persona` is who sits in this seat (constants.ts lineup); `level` is the student's mic level, so listeners nod while
// the student talks.
type Props = { persona: number; course: Course | null; status: PanelistStatus; count: number; level?: number };
export function Panelist({ persona, course, status, count, level = 0 }: Props) {
  const big = count === 1 ? 84 : count === 2 ? 74 : 64;
  const size = status === "speaking" ? big : big - 8;
  const { name } = PANEL[persona]!;
  const role = panelLabel(persona, course);

  return (
    <View style={[styles.wrap, status === "offline" && styles.offline]} accessible accessibilityLabel={`${name}, ${role}. ${STATUS[status]}`}>
      <View style={{ width: size, height: size }}>
        {status === "speaking" && <Pulse size={size} />}
        <PanelFace index={persona} size={size} mood={status} level={level} />
        {status === "thinking" && (
          <View style={styles.bubble}>
            {[0.3, 0.6, 1].map((o) => (
              <View key={o} style={[styles.bubbleDot, { opacity: o }]} />
            ))}
          </View>
        )}
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {name} · {role}
      </Text>
      <Text style={[styles.status, status === "speaking" && styles.statusSpeaking]}>{STATUS[status]}</Text>
    </View>
  );
}

// A soft dusk ring breathing around the speaker's circle; Reanimated skips it when the system reduces motion.
function Pulse({ size }: { size: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 1200 }), -1, true);
    return () => cancelAnimation(t);
  }, [t]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: 1.08 + 0.08 * t.value }], opacity: 0.7 - 0.35 * t.value }));
  return <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: size / 2, backgroundColor: colors.duskTint }, style]} />;
}

const styles = StyleSheet.create({
  wrap: { width: 84, alignItems: "center", gap: 7 },
  offline: { opacity: 0.45 },
  bubble: {
    position: "absolute",
    top: -10,
    right: -10,
    flexDirection: "row",
    gap: 3,
    backgroundColor: colors.paper,
    borderRadius: 10,
    paddingVertical: 5,
    paddingHorizontal: 7,
    elevation: 2,
  },
  bubbleDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.ink },
  name: { fontFamily: fonts.body, fontWeight: "600", fontSize: 11.5, color: colors.ink, textAlign: "center" },
  status: { fontFamily: fonts.body, fontWeight: "500", fontSize: 10.5, color: colors.muted, marginTop: -5, minHeight: 13 },
  statusSpeaking: { color: colors.duskLink },
});
