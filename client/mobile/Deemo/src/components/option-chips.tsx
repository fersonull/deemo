import { StyleSheet, Text, View } from "react-native";

import { PressableScale } from "@/components/pressable-scale";
import { colors, fonts } from "@/theme";

// One-of-many choice chips for a sort-and-filter sheet (History, Projects).
export function OptionChips<T extends string>({
  options,
  value,
  onPick,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onPick: (v: T) => void;
  label: string;
}) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.options}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <PressableScale
            layered
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            onPress={() => onPick(o.value)}
            style={[styles.chip, selected && styles.chipSelected]}
          >
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{o.label}</Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  options: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { minHeight: 44, paddingVertical: 10, borderRadius: 22, paddingHorizontal: 16, justifyContent: "center", backgroundColor: colors.sand },
  chipSelected: { backgroundColor: colors.ink },
  chipText: { fontFamily: fonts.body, fontWeight: "600", fontSize: 13, color: colors.ink },
  chipTextSelected: { color: colors.paper },
});
