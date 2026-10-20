import { StyleSheet, Text, type ViewStyle } from "react-native";

import { Blob } from "@/components/blob";
import { Icon } from "@/components/icon";
import { PressableDepth } from "@/components/pressable-depth";
import { colors, type } from "@/theme";

type Props = { label: string; icon?: string; onPress: () => void; style?: ViewStyle };

// The prototype's "Start practice" pill: ink, with the panel's pebble holding the icon (Home, empty History).
export function StartButton({ label, icon = "mic", onPress, style }: Props) {
  return (
    <PressableDepth onPress={onPress} style={[styles.size, style]} faceStyle={styles.start} depthColor={colors.inkDepth}>
      <Text style={[type.button, styles.label]}>{label}</Text>
      <Blob width={44} height={44}>
        <Icon name={icon} size={22} color={colors.paper} filled />
      </Blob>
    </PressableDepth>
  );
}

const styles = StyleSheet.create({
  size: { height: 60 },
  start: {
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
