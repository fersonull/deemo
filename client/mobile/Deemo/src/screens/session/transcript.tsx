import { LinearGradient } from "expo-linear-gradient";
import { useRef } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { PanelFace } from "@/components/panel-face";
import { PANEL } from "@/constants";
import type { Line } from "@/live/types";
import { colors, fonts } from "@/theme";

type Props = { lines: Line[]; partial: Line | null; seats: number[] }; // live lines hold seats; seats[seat] is the persona

const CLEAR = `${colors.paper}00`; // paper at 0 alpha, so the fade never passes through grey

// Real-Time Transcript (plan F10). Follows new text unless the student has scrolled back.
export function Transcript({ lines, partial, seats }: Props) {
  const ref = useRef<ScrollView>(null);
  const atBottom = useRef(true);
  const all = partial ? [...lines, partial] : lines;

  return (
    <View style={styles.wrap}>
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
          // Like a real panel: nothing on screen marks a contradiction; the panelist challenges it out loud (issue #14),
          // and the report lists them afterwards.
          const persona = l.who === "you" ? 0 : (seats[l.who] ?? 0);
          const name = l.who === "you" ? "You" : PANEL[persona]!.name;
          return (
            <View
              key={i}
              style={styles.line}
              accessible
              accessibilityLabel={`${name}: ${l.text}`}
            >
              {l.who === "you" ? null : <View style={styles.face}><PanelFace index={persona} size={20} still /></View>}
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
      {/* Soft edges where the transcript meets the question card and the controls (prototype mask). */}
      <LinearGradient pointerEvents="none" colors={[colors.paper, CLEAR]} style={[styles.fade, styles.fadeTop]} />
      <LinearGradient pointerEvents="none" colors={[CLEAR, colors.paper]} style={[styles.fade, styles.fadeBottom]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingTop: 22, paddingHorizontal: 22, paddingBottom: 24, gap: 9 }, // room to scroll clear of the fades
  fade: { position: "absolute", left: 0, right: 0 },
  fadeTop: { top: 0, height: 24 },
  fadeBottom: { bottom: 0, height: 28 },
  line: { flexDirection: "row", gap: 8 },
  face: { marginTop: 1 },
  text: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13.5,
    lineHeight: 19.5,
    color: colors.inkMuted,
  },
  name: { fontWeight: "600", color: colors.ink },
  tail: { color: colors.faint },
});
