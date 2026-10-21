import { StyleSheet, Text, View } from "react-native";
import Animated, { LinearTransition, useReducedMotion } from "react-native-reanimated";

import { PanelFace } from "@/components/panel-face";
import { lineup, panelistName, panelLabel, type Course } from "@/constants";
import { colors, fonts, lit, radius, type } from "@/theme";
import { riseIn } from "@/utils/motion";

// Who will sit for this many panelists and this course (constants.ts lineup, the same seats the session uses), in the
// order they'll question.
export function PanelPreview({ course, panelists }: { course: Course | null; panelists: number }) {
  const reduced = useReducedMotion();
  const seats = lineup(course, panelists);
  const label = `Your panel: ${seats.map((p) => `${panelistName(p, course)}, ${panelLabel(p, course)}`).join("; ")}.`;

  return (
    <View accessible accessibilityLabel={label} style={styles.wrap}>
      <View style={styles.row}>
        {seats.map((p, i) => (
          <Animated.View
            key={`${p}-${course}`}
            entering={riseIn(i * 40, reduced)}
            layout={reduced ? undefined : LinearTransition.duration(220)}
            style={styles.card}
          >
            <PanelFace index={p} size={40} still />
            <Text style={styles.name} numberOfLines={1}>
              {panelistName(p, course)}
            </Text>
            <Text style={styles.role} numberOfLines={1}>
              {panelLabel(p, course)}
            </Text>
          </Animated.View>
        ))}
      </View>
      {panelists === 1 ? <Text style={styles.note}>Covers the whole defense.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 8 },
  row: { flexDirection: "row", gap: 6 },
  card: {
    ...lit,
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    gap: 2,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: radius.lg,
    backgroundColor: colors.sand,
  },
  name: { fontFamily: fonts.body, fontWeight: "600", fontSize: 13, color: colors.ink, marginTop: 4 },
  role: { ...type.meta, fontSize: 11.5 },
  note: { ...type.meta, lineHeight: 17, marginTop: 6, paddingHorizontal: 4 },
});
