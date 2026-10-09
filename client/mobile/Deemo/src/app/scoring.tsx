import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { BackHandler, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";

import { Blob } from "@/components/blob";
import { Button } from "@/components/button";
import { Screen } from "@/components/screen";
import { colors, fonts, type } from "@/theme";
import { formatTime } from "@/utils/format-time";

// Session complete (screen 12): a calm bridge while the report is written.
// ponytail: no scoring call or results screen yet, so it offers the way home.
export default function Scoring() {
  const { ms = "0", answered = "0" } = useLocalSearchParams<{ ms?: string; answered?: string }>();
  const home = () => router.dismissAll();

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      home();
      return true;
    });
    return () => sub.remove();
  }, []);

  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 2400 }), -1, true);
  }, [t]);
  const breathe = useAnimatedStyle(() => ({ transform: [{ scale: 1 + 0.06 * t.value }] }));

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
        <Text style={styles.body}>The panel is writing up your notes. Results come in a later update.</Text>
        <View style={styles.stats}>
          <Stat value={formatTime(Number(ms))} label="session" />
          <Stat value={answered} label="answered" />
        </View>
      </View>
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
});
