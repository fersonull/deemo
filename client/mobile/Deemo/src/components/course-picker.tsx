import { PressableScale } from "@/components/pressable-scale";
import { StyleSheet, Text, View } from "react-native";

import { COURSES, type Course } from "@/constants";
import { colors, fonts } from "@/theme";

// The student's course as wrapping chips (onboarding survey and Profile). Adaptive Domain Profiling, plan F4.
export function CoursePicker({ value, onPick }: { value: Course | null; onPick: (c: Course) => void }) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Your course" style={styles.chips}>
      {COURSES.map((c) => {
        const selected = c === value;
        return (
          <PressableScale
            key={c}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            onPress={() => onPick(c)}
            style={[styles.chip, selected && styles.chipSelected]}
          >
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{c}</Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { minHeight: 44, borderRadius: 22, paddingHorizontal: 16, justifyContent: "center", backgroundColor: colors.sand },
  chipSelected: { backgroundColor: colors.fill },
  chipText: { fontFamily: fonts.body, fontWeight: "500", fontSize: 14, color: colors.ink },
  chipTextSelected: { color: colors.onFill },
});
