import type { ReactNode } from "react";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";

import { Deemo, type DeemoMood } from "@/components/deemo";
import { colors, lit, radius, type } from "@/theme";

type Props = {
  mood?: DeemoMood;
  size?: "m" | "s";
  children: ReactNode; // words; nest <Text> for bold or colored parts
  startle?: boolean; // Deemo shakes and looks nervous for a moment (pass on the message that reports an error)
  style?: ViewStyle;
};

// "Deemo says" (design D3): Deemo beside a flat sand bubble, looking at it. The words are real text, so screen
// readers read the bubble, not the character. Scripted lines only: at most two sentences, no exclamation marks.
export function DeemoNote({ mood = "idle", size = "s", children, startle, style }: Props) {
  return (
    <View style={[styles.row, style]}>
      <Deemo mood={mood} size={size} look="right" startle={startle} />
      <View style={styles.bubble}>
        <Text style={styles.text}>{children}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  bubble: { ...lit, flex: 1, backgroundColor: colors.sand, borderRadius: radius.lg, paddingVertical: 12, paddingHorizontal: 14 },
  text: { ...type.body, color: colors.inkSoft },
});
