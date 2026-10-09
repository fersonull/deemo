import { useRef } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { PANEL } from "@/constants";
import type { Line } from "@/live/types";
import { colors, fonts } from "@/theme";

type Props = { lines: Line[]; partial: Line | null; coach: boolean };

// Real-Time Transcript (plan F10). Follows new text unless the student has scrolled back.
export function Transcript({ lines, partial, coach }: Props) {
  const ref = useRef<ScrollView>(null);
  const atBottom = useRef(true);
  const all = partial ? [...lines, partial] : lines;

  return (
    <ScrollView
      ref={ref}
      style={styles.scroll}
      contentContainerStyle={styles.content}
      // Only the student's own drag decides "scrolled back"; layout changes (a taller question card) don't.
      onScrollEndDrag={({ nativeEvent: n }) => {
        atBottom.current = n.contentOffset.y + n.layoutMeasurement.height >= n.contentSize.height - 24;
      }}
      onMomentumScrollEnd={({ nativeEvent: n }) => {
        atBottom.current = n.contentOffset.y + n.layoutMeasurement.height >= n.contentSize.height - 24;
      }}
      onContentSizeChange={() => atBottom.current && ref.current?.scrollToEnd({ animated: true })}
      onLayout={() => atBottom.current && ref.current?.scrollToEnd({ animated: false })}
      accessibilityLabel="Transcript"
    >
      {all.map((l, i) => {
        const live = partial && i === all.length - 1;
        // Coach mode: a quiet amber dot on a contradicting line. Panel mode: nothing on screen (addendum Q3).
        const marked = coach && l.flagged;
        const name = l.who === "you" ? "You" : PANEL[l.who].name;
        return (
          <View
            key={i}
            style={styles.line}
            accessible
            accessibilityLabel={`${name}: ${l.text}${marked ? ". Possible contradiction with your manuscript." : ""}`}
          >
            {/* Separate elements: recoloring one View after mount drew it square on Android. */}
            {marked ? <View key="flag" style={[styles.dot, styles.dotFlag]} /> : <View key="none" style={styles.dot} />}
            <Text style={styles.text}>
              <Text style={styles.name}>{name}</Text>
              {"  "}
              {l.text}
              {live && <Text style={styles.tail}> …</Text>}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingTop: 14, paddingHorizontal: 22, paddingBottom: 6, gap: 9 },
  line: { flexDirection: "row", gap: 8 },
  dot: { width: 7, height: 7, borderRadius: 3.5, marginTop: 7 },
  dotFlag: { backgroundColor: colors.amber },
  text: { flex: 1, fontFamily: fonts.body, fontSize: 13.5, lineHeight: 19.5, color: colors.inkMuted },
  name: { fontWeight: "600", color: colors.ink },
  tail: { color: colors.faint },
});
