import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { Deemo } from "@/components/deemo";
import { Icon } from "@/components/icon";
import { PressableScale } from "@/components/pressable-scale";
import { Score } from "@/components/score";
import { colors, easeOut, fonts, radius, type } from "@/theme";
import { briefText, type Brief } from "@/utils/home-brief";

// Deemo, the informer, at the top of Home. The bubble leads with the last score as a big headline (number and band in
// the band's color, where it's easy to see), then at most three lines on what changed and what to work on, important
// parts in bold. Deemo's face follows the score. Tap it to open that report. The words fade in when they change.
export function DeemoBrief({ brief }: { brief: Brief }) {
  const { openId } = brief;
  const body = (
    <>
      <Deemo mood={brief.mood} look="right" />
      <View style={styles.bubble}>
        <View style={styles.tail} />
        {brief.headline ? (
          <View style={styles.headline}>
            <Score value={brief.headline.score} style={{ ...styles.score, color: brief.headline.color }} />
            <Text style={[styles.band, { color: brief.headline.color }]} numberOfLines={2}>
              {brief.headline.band}
            </Text>
          </View>
        ) : null}
        <Animated.Text
          key={briefText(brief)}
          entering={FadeIn.duration(220).easing(easeOut)}
          style={styles.text}
          numberOfLines={3}
        >
          {brief.parts.map((p, i) =>
            p.strong ? (
              <Text key={i} style={[styles.strong, p.color ? { color: p.color } : null]}>
                {p.text}
              </Text>
            ) : (
              p.text
            ),
          )}
        </Animated.Text>
        {openId ? (
          <View style={styles.more}>
            <Text style={styles.moreText}>See the report</Text>
            <Icon name="chevron_right" size={16} color={colors.duskLink} />
          </View>
        ) : null}
      </View>
    </>
  );

  if (!openId)
    return (
      <View style={styles.row} accessible accessibilityLabel={briefText(brief)} accessibilityLiveRegion="polite">
        {body}
      </View>
    );
  return (
    <PressableScale
      scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel={briefText(brief)}
      accessibilityHint="Opens the report"
      onPress={() => router.push({ pathname: "/results", params: { id: openId } })}
      style={styles.row}
    >
      {body}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 18 },
  bubble: { flex: 1, backgroundColor: colors.sand, borderRadius: radius.lg, paddingVertical: 13, paddingHorizontal: 15 },
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
  headline: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  score: { fontFamily: fonts.display, fontWeight: "800", fontSize: 36, lineHeight: 40, letterSpacing: -1.2 },
  band: { flex: 1, fontFamily: fonts.display, fontWeight: "700", fontSize: 16, lineHeight: 19 },
  text: { ...type.body, fontSize: 14, lineHeight: 20, color: colors.inkSoft },
  strong: { fontFamily: fonts.body, fontWeight: "700", color: colors.ink },
  more: { flexDirection: "row", alignItems: "center", gap: 2, marginTop: 8 },
  moreText: { fontFamily: fonts.body, fontWeight: "600", fontSize: 12.5, color: colors.duskLink },
});
