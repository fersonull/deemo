import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { Blob } from "@/components/blob";
import { Button } from "@/components/button";
import { colors, easeOut, fonts, type } from "@/theme";
import { PressableScale } from "@/components/pressable-scale";

type Props = { time: string; onResume: () => void; onEnd: () => void };

export function PausedOverlay({ time, onResume, onEnd }: Props) {
  return (
    <Animated.View
      entering={FadeIn.duration(200).easing(easeOut)}
      exiting={FadeOut.duration(150)}
      style={styles.overlay}
      accessibilityViewIsModal
    >
      <Blob width={96} height={84} color={colors.sand}>
        <View style={styles.bars}>
          <View style={styles.bar} />
          <View style={styles.bar} />
        </View>
      </Blob>
      <Text style={styles.title} accessibilityRole="header">
        Paused.
      </Text>
      <Text style={styles.body}>
        Take a breath. Timers stopped at <Text style={styles.mono}>{time}</Text>. The panel will wait.
      </Text>
      <View style={styles.actions}>
        <Button label="Resume" onPress={onResume} />
        <PressableScale accessibilityRole="button" onPress={onEnd} style={styles.end}>
          <Text style={[type.button, styles.endText]}>End session</Text>
        </PressableScale>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(247,243,236,0.94)",
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },
  bars: { flexDirection: "row", gap: 7 },
  bar: { width: 8, height: 28, borderRadius: 4, backgroundColor: colors.ink },
  title: { ...type.hero, marginTop: 22 },
  body: { ...type.body, color: colors.inkMuted, textAlign: "center", marginTop: 8 },
  mono: { fontFamily: fonts.mono },
  actions: { alignSelf: "stretch", marginTop: 30 },
  end: { height: 52, alignItems: "center", justifyContent: "center", marginTop: 6 },
  endText: { fontSize: 15, color: colors.ink },
});
