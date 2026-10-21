import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { Deemo } from "@/components/deemo";
import { colors, type } from "@/theme";

// Opening something that already exists (a report from Recent, a manuscript summary): Deemo reading.
// Fades in after a beat, so a quick load never flashes it. Waits for new work (reading a manuscript, scoring)
// use Working instead.
export function Fetching({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <Animated.View entering={FadeIn.delay(300).duration(200)} style={styles.wrap} accessibilityLiveRegion="polite">
      <View style={styles.art}>
        <Deemo mood="reading" />
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
  title: { ...type.title, marginTop: 12 },
  sub: { ...type.body, color: colors.inkMuted, marginTop: 8 },
});
