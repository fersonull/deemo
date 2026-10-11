import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { Blob } from "@/components/blob";
import { Button } from "@/components/button";
import { Deemo } from "@/components/deemo";
import { Screen } from "@/components/screen";
import { colors, type } from "@/theme";

const SLIDES = [
  {
    title: "Your panel reads your paper first.",
    bullets: [
      "Upload your manuscript as a PDF or DOCX.",
      "We summarize it, and you check it.",
      "Questions come from your own chapters.",
    ],
  },
  {
    title: "Then you defend it, out loud.",
    bullets: [
      "A live voice panel of one to three.",
      "Follow-ups when an answer is thin.",
      "Pause any time. The panel will wait.",
    ],
  },
  {
    title: "And learn what to fix next.",
    bullets: [
      "A readiness score, with the reasons.",
      "Every contradiction, quoted.",
      "Practice only, not an official evaluation.",
    ],
  },
];

export default function Welcome() {
  const [i, setI] = useState(0);
  const last = i === SLIDES.length - 1;
  const slide = SLIDES[i];

  return (
    <Screen>
      <View style={styles.top}>
        {!last && (
          <Pressable accessibilityRole="button" hitSlop={12} onPress={() => router.push("/consent")}>
            <Text style={styles.skip}>Skip</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.hero}>
        {/* Deemo greets and sends off; slide 2 introduces the panel, so it shows a speaking panelist instead. */}
        {i === 1 ? (
          <>
            <SpeakingRing />
            <Blob width={136} height={116}>
              <Dots />
            </Blob>
          </>
        ) : (
          <Deemo key={i} size="l" mood={last ? "cheering" : "waving"} />
        )}
      </View>

      <Text style={[type.display, styles.title]}>{slide.title}</Text>
      <View style={styles.bullets}>
        {slide.bullets.map((b) => (
          <View key={b} style={styles.bullet}>
            <View style={styles.bulletDot} />
            <Text style={styles.bulletText}>{b}</Text>
          </View>
        ))}
      </View>

      <View style={styles.spacer} />
      <View style={styles.pager} accessibilityLabel={`Slide ${i + 1} of ${SLIDES.length}`}>
        {SLIDES.map((s, k) => (
          <View key={s.title} style={[styles.pagerDot, k === i && styles.pagerDotActive]} />
        ))}
      </View>
      <Button label={last ? "Let's go" : "Next"} onPress={() => (last ? router.push("/consent") : setI(i + 1))} />
      <Text style={styles.note}>Practice only, not an official evaluation.</Text>
    </Screen>
  );
}

function Dots() {
  return (
    <View style={styles.dots}>
      <View style={[styles.dot, styles.dotDim]} />
      <View style={styles.dot} />
      <View style={[styles.dot, styles.dotDim]} />
    </View>
  );
}

// Soft "panel is speaking" pulse; Reanimated skips it when the system reduces motion.
function SpeakingRing() {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 1600 }), -1, true);
  }, [t]);
  const ring = useAnimatedStyle(() => ({ transform: [{ scale: 1.1 + 0.08 * t.value }] }));
  return (
    <Animated.View style={[styles.ring, ring]}>
      <Blob width={136} height={116} color={colors.duskTint} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  top: { height: 44, alignItems: "flex-end", justifyContent: "center" },
  skip: { ...type.bodyStrong, color: colors.muted },
  hero: { height: 150, justifyContent: "center", alignItems: "flex-start" },
  ring: { position: "absolute", left: 0, opacity: 0.7 },
  dots: { flexDirection: "row", gap: 10 },
  dot: { width: 13, height: 13, borderRadius: 7, backgroundColor: colors.paper },
  dotDim: { opacity: 0.6 },
  title: { marginTop: 28 },
  bullets: { gap: 14, marginTop: 26 },
  bullet: { flexDirection: "row", gap: 14, alignItems: "center" },
  bulletDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.dusk },
  bulletText: { ...type.body, flex: 1, fontSize: 15.5, lineHeight: 22, color: colors.inkSoft },
  spacer: { flex: 1 },
  pager: { flexDirection: "row", gap: 6, justifyContent: "center", marginBottom: 18 },
  pagerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  pagerDotActive: { width: 22, backgroundColor: colors.ink },
  note: { ...type.body, fontSize: 12.5, color: colors.inkMuted, textAlign: "center", marginTop: 14 },
});
