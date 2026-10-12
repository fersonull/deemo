import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { Deemo, type DeemoMood } from "@/components/deemo";
import { PressableScale } from "@/components/pressable-scale";
import { colors, easeOut, radius, type } from "@/theme";
import { nextTip, TIPS } from "@/utils/tips";

// Deemo on Home with a defense tip (design D3: Deemo's lines, a flat sand bubble). It waves hello once, then idles.
// Tap for another tip: the words fade in and Deemo gives one small hop. Screen readers read the tip, not Deemo.
export function DeemoTip() {
  const [tip, setTip] = useState(() => nextTip(null));
  const [mood, setMood] = useState<DeemoMood>("waving");
  const [hop, setHop] = useState(0); // remounts Deemo so the cheer hop plays on every tap

  // Back to idle once a hop has played.
  useEffect(() => {
    if (mood !== "cheering") return;
    const t = setTimeout(() => setMood("idle"), 700);
    return () => clearTimeout(t);
  }, [mood, hop]);

  const another = () => {
    setTip((t) => nextTip(t));
    setMood("cheering");
    setHop((h) => h + 1);
  };

  return (
    <PressableScale
      scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel={`Tip: ${TIPS[tip]}`}
      accessibilityHint="Shows another tip"
      onPress={another}
      style={styles.row}
    >
      <Deemo key={`${mood}-${hop}`} mood={mood} look="right" />
      <View style={styles.bubble}>
        <View style={styles.tail} />
        <Text style={styles.label}>TIP</Text>
        <Animated.Text key={tip} entering={FadeIn.duration(220).easing(easeOut)} style={styles.text}>
          {TIPS[tip]}
        </Animated.Text>
        <Text style={styles.more}>Tap for another</Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 18 },
  bubble: { flex: 1, backgroundColor: colors.sand, borderRadius: radius.lg, paddingVertical: 12, paddingHorizontal: 14 },
  // A small notch pointing back at Deemo, so the bubble reads as Deemo speaking.
  tail: {
    position: "absolute",
    left: -6,
    top: "50%",
    marginTop: -6,
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: colors.sand,
    transform: [{ rotate: "45deg" }],
  },
  label: { ...type.label, fontSize: 9.5 },
  text: { ...type.body, color: colors.inkSoft, marginTop: 3 },
  more: { ...type.meta, fontSize: 11, marginTop: 6 },
});
