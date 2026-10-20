import { StyleSheet, Text, type ViewStyle } from "react-native";

import { Blob } from "@/components/blob";
import { Icon } from "@/components/icon";
import { PressableScale } from "@/components/pressable-scale";
import { colors, type } from "@/theme";

type Props = { label: string; icon?: string; onPress: () => void; style?: ViewStyle };

// The prototype's "Start practice" pill: ink, with the panel's pebble holding the icon (Home, empty History).
export function StartButton({ label, icon = "mic", onPress, style }: Props) {
  return (
    <PressableScale accessibilityRole="button" onPress={onPress} style={[styles.start, style]} depthColor={colors.inkDepth}>
      <Text style={[type.button, styles.label]}>{label}</Text>
      <Blob width={44} height={44}>
        <Icon name={icon} size={22} color={colors.paper} filled />
      </Blob>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  start: {
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.ink,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingLeft: 22,
    paddingRight: 8,
  },
  label: { flex: 1, color: colors.paper },
});
