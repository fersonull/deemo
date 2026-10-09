import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";

import { Blob } from "@/components/blob";
import { PANEL } from "@/constants";
import { colors, fonts, panelist as fills } from "@/theme";

export type PanelistStatus = "speaking" | "listening" | "thinking" | "offline";

const FILL = [fills.chair, fills.technical, fills.methodology];
const STATUS = { speaking: "Speaking", listening: "Listening", thinking: "Thinking…", offline: "Joining…" };

// Abstract avatar from the prototype: Chair wears a cap, Tech has glasses, Methods an ID card.
export function Panelist({ index, status, count }: { index: number; status: PanelistStatus; count: number }) {
  const big = count === 1 ? 84 : count === 2 ? 74 : 64;
  const w = status === "speaking" ? big : big - 8;
  const h = Math.round(w * 0.87);
  const speaking = status === "speaking";
  const fg = speaking ? colors.paper : colors.ink;
  const es = Math.max(5, Math.round(w * 0.085)); // eye size
  const ex = [Math.round(w * 0.31), Math.round(w * 0.58)];
  const ey = Math.round(h * (status === "thinking" ? 0.33 : 0.4));
  const { name, role } = PANEL[index];

  return (
    <View
      style={[styles.wrap, status === "offline" && styles.offline]}
      accessible
      accessibilityLabel={`${name}, ${role}. ${STATUS[status]}`}
    >
      <View style={{ width: w, height: h }}>
        {speaking && <Pulse w={w} h={h} />}
        <Blob width={w} height={h} color={speaking ? colors.dusk : FILL[index]} />

        {index === 0 && <View style={[styles.cap, { top: -Math.max(6, Math.round(w * 0.1)), height: Math.max(6, Math.round(w * 0.1)) }]} />}
        {index === 2 && <View style={styles.card} />}

        {ex.map((x) =>
          status === "offline" ? (
            <View key={x} style={[styles.closedEye, { left: x - es * 0.3, top: ey, width: es * 1.6, backgroundColor: fg }]} />
          ) : (
            <View key={x} style={[styles.eye, { left: x, top: ey, width: es, height: es, backgroundColor: fg }]} />
          ),
        )}
        {index === 1 &&
          ex.map((x) => {
            const gw = Math.round(w * 0.24);
            const gh = Math.round(w * 0.2);
            return (
              <View
                key={`g${x}`}
                style={[styles.glasses, { left: x - (gw - es) / 2, top: ey - (gh - es) / 2, width: gw, height: gh, borderColor: fg }]}
              />
            );
          })}

        {speaking && <Mouth w={w} h={h} />}
        {status === "listening" && <View style={[styles.smile, { left: (w - w * 0.18) / 2, top: h * 0.56, width: w * 0.18 }]} />}
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
      <Text style={[styles.status, speaking && styles.statusSpeaking]}>{STATUS[status]}</Text>
    </View>
  );
}

// Soft speaking pulse; Reanimated skips it when the system reduces motion.
function Pulse({ w, h }: { w: number; h: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 1200 }), -1, true);
  }, [t]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: 1.12 + 0.1 * t.value }], opacity: 0.55 - 0.25 * t.value }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <Blob width={w} height={h} color={colors.duskTint} />
    </Animated.View>
  );
}

function Mouth({ w, h }: { w: number; h: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 260 }), -1, true);
  }, [t]);
  const mw = Math.round(w * 0.13);
  const style = useAnimatedStyle(() => ({ height: Math.max(3, w * 0.04 + w * 0.07 * t.value) }));
  return <Animated.View style={[styles.mouth, { left: (w - mw) / 2, top: h * 0.64, width: mw, borderRadius: mw }, style]} />;
}

const styles = StyleSheet.create({
  wrap: { width: 84, alignItems: "center", gap: 7 },
  offline: { opacity: 0.45 },
  cap: { position: "absolute", left: "29%", width: "42%", borderRadius: 3, backgroundColor: colors.ink },
  card: {
    position: "absolute",
    top: "14%",
    right: "7%",
    width: "15%",
    height: "24%",
    borderRadius: 3,
    backgroundColor: colors.paper,
    borderWidth: 2,
    borderColor: colors.ink,
  },
  eye: { position: "absolute", borderRadius: 99 },
  closedEye: { position: "absolute", height: 2.5, borderRadius: 2 },
  glasses: { position: "absolute", borderWidth: 2.5, borderRadius: 5 },
  mouth: { position: "absolute", backgroundColor: colors.ink, opacity: 0.55 },
  smile: {
    position: "absolute",
    height: 6,
    borderBottomWidth: 2,
    borderColor: colors.ink,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  bubble: {
    position: "absolute",
    top: -12,
    right: -8,
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
  status: { fontFamily: fonts.body, fontWeight: "500", fontSize: 10.5, color: colors.muted, marginTop: -5, height: 13 },
  statusSpeaking: { color: colors.duskLink },
});
