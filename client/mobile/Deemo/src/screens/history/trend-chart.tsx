import { router } from "expo-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, {
  FadeIn,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Line, Path } from "react-native-svg";

import { Blob } from "@/components/blob";
import { Deemo } from "@/components/deemo";
import { Icon } from "@/components/icon";
import { PressableScale } from "@/components/pressable-scale";
import { Score } from "@/components/score";
import { MODE_LABELS } from "@/constants";
import type { SessionSummary } from "@/hooks/use-sessions";
import { colors, easeOut, fonts, radius, type } from "@/theme";
import { columnPath, columns, contentWidth, scoreY, type Box, type Column } from "@/utils/chart";

const READY = 85; // "Defense-ready" band (addendum Q4)
const BOX: Box = { height: 0, top: 22, bottom: 1 }; // height per size; room above for the picked column's value

const AnimatedPath = Animated.createAnimatedComponent(Path);

const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

// Readiness per session (plan F15, S-13): one column each, oldest to newest, growing from 0 and filling the width. Kept quiet: a
// baseline, one hairline at 85 (defense-ready), the columns, and the picked one's value. One series, so no legend.
// Tap a column to preview it in the readout above (score, stage, date, change since the session before) and open
// its report; the newest is picked to start. Many sessions scroll sideways, starting at the newest. Columns grow in
// once, a few ms apart (still with reduce motion). `compact` is the shorter Home version. Fewer than two scored
// sessions show the empty state instead (Empty below), with `children` as its action; compact shows nothing then.
type Props = { sessions: SessionSummary[]; stage: string | null; compact?: boolean; children?: ReactNode };

export function TrendChart({ sessions, stage, compact, children }: Props) {
  const [visible, setVisible] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const reduced = useReducedMotion();
  const scroller = useRef<ScrollView>(null);
  const atEnd = useRef(false);

  const height = compact ? 112 : 150;
  const box: Box = { ...BOX, height };
  const scored = sessions.filter((s) => s.score !== undefined).reverse();
  const scores = scored.map((s) => s.score ?? 0);
  const width = contentWidth(scored.length, visible);
  const cols = visible ? columns(scores, width, box) : [];
  const sel = Math.min(picked ?? scored.length - 1, scored.length - 1);

  // Grow the columns in once, when the plot first has a width.
  const grown = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (visible && !reduced) grown.value = withTiming(1, { duration: 600, easing: easeOut });
  }, [visible, reduced, grown]);

  if (scored.length < 2) return compact ? null : <Empty score={scored[0]?.score} stage={stage} action={children} />;

  const first = scored[0];
  const last = scored[scored.length - 1];
  const s = scored[sel];
  const delta = sel > 0 ? scores[sel] - scores[sel - 1] : null;
  const c = cols[sel];
  const readyY = scoreY(READY, box);

  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      {/* Readout: the picked session, with its report one tap away. It cross-fades when the pick changes. */}
      <View style={styles.readout}>
        <Animated.View key={sel} entering={FadeIn.duration(180)} style={styles.readoutText} accessibilityLiveRegion="polite">
          <Score value={s.score!} style={compact ? { ...styles.score, ...styles.scoreCompact } : styles.score} />
          <View style={styles.flex}>
            <Text style={styles.readMeta} numberOfLines={1}>
              {MODE_LABELS[s.mode]} · {day(s.createdAt)}
            </Text>
            {delta === null ? (
              <Text style={styles.delta}>First one here</Text>
            ) : (
              <View style={styles.deltaRow}>
                {delta ? <Icon name={delta > 0 ? "arrow_upward" : "arrow_downward"} size={13} color={colors.inkMuted} /> : null}
                <Text style={styles.delta} numberOfLines={1}>
                  {delta === 0 ? "Same as last time" : `${Math.abs(delta)} ${Math.abs(delta) === 1 ? "point" : "points"} since last`}
                </Text>
              </View>
            )}
          </View>
        </Animated.View>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`Open the ${MODE_LABELS[s.mode]} report from ${day(s.createdAt)}`}
          hitSlop={8}
          onPress={() => router.push({ pathname: "/results", params: { id: s.id } })}
          style={styles.open}
        >
          <Icon name="arrow_outward" size={18} color={colors.ink} />
        </PressableScale>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        ref={scroller}
        style={{ height }}
        onLayout={(e) => setVisible(e.nativeEvent.layout.width)}
        // Start at the newest sessions, once; after that the student's own scrolling stays put.
        onContentSizeChange={() => {
          if (atEnd.current || !visible) return;
          atEnd.current = true;
          scroller.current?.scrollToEnd({ animated: false });
        }}
      >
        {visible ? (
          <View style={{ width, height }}>
            <Svg width={width} height={height}>
              <Line x1={0} x2={width} y1={readyY} y2={readyY} stroke={colors.border} strokeWidth={1} />
              <Line x1={0} x2={width} y1={height - box.bottom} y2={height - box.bottom} stroke={colors.border} strokeWidth={1} />
              {cols.map((col, i) => (
                <Bar key={i} col={col} grown={grown} delay={i} total={cols.length} color={i === sel ? colors.duskInk : colors.dusk} />
              ))}
            </Svg>
            <Text style={[styles.ready, { top: readyY - 15 }]}>85%</Text>
            {/* The picked column's value rides its top (the only number in the plot) */}
            {c ? (
              <Text style={[styles.value, { left: Math.min(Math.max(c.x + c.width / 2 - 20, 0), width - 40), top: c.y - 18 }]}>
                {s.score}%
              </Text>
            ) : null}
            {/* Tap targets: the whole slot, taller and wider than the column */}
            {cols.map((_, i) => (
              <Pressable
                key={i}
                accessibilityRole="button"
                accessibilityState={{ selected: i === sel }}
                accessibilityLabel={`${MODE_LABELS[scored[i].mode]}, ${day(scored[i].createdAt)}, readiness ${scored[i].score} percent`}
                accessibilityHint="Shows this session above"
                onPress={() => setPicked(i)}
                style={[styles.hit, { left: (i * width) / cols.length, width: width / cols.length }]}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.axis} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Text style={styles.meta}>{day(first.createdAt)}</Text>
        <Text style={styles.meta}>{day(last.createdAt)}</Text>
      </View>
    </View>
  );
}

// One column, growing up from the baseline; neighbors start a beat apart (at most ~240 ms across the chart).
function Bar({
  col,
  grown,
  delay,
  total,
  color,
}: {
  col: Column;
  grown: SharedValue<number>;
  delay: number;
  total: number;
  color: string;
}) {
  const lag = Math.min(0.4, (delay / Math.max(1, total)) * 0.4);
  const growing = useAnimatedProps(() => {
    const t = Math.max(0, Math.min(1, (grown.value - lag) / (1 - lag)));
    return { d: columnPath(col, t) };
  });
  return <AnimatedPath animatedProps={growing} d={columnPath(col)} fill={color} />;
}

// Fewer than two scored sessions: pebbles stepping up like the trend to come, Deemo on top (or the one score
// so far), then what it takes to draw the line.
function Empty({ score, stage, action }: { score?: number; stage: string | null; action?: ReactNode }) {
  const title = score !== undefined ? `${score}% so far` : stage ? `No ${stage} scores yet` : "Your trend starts here";
  const note =
    score !== undefined
      ? "One more scored session and your trend line appears."
      : stage
        ? `Practice a ${stage} round to start this trend.`
        : "Finish two scored sessions to see your readiness over time.";
  return (
    <View style={[styles.card, styles.empty]}>
      <View style={styles.pebbles} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Blob width={38} height={33} color={colors.duskTint} />
        <Blob width={52} height={45} color={colors.duskSoft} />
        {score !== undefined ? (
          <Blob width={76} height={66}>
            <Score value={score} style={styles.pebbleScore} />
          </Blob>
        ) : (
          <Deemo />
        )}
      </View>
      <Text accessibilityRole="header" style={styles.emptyTitle}>
        {title}
      </Text>
      <Text style={styles.emptyNote}>{note}</Text>
      {action ? <View style={styles.emptyAction}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  card: { backgroundColor: colors.sand, borderRadius: radius.xl, padding: 16, marginTop: 18 },
  cardCompact: { marginTop: 8, paddingBottom: 12 },
  readout: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 6 },
  readoutText: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  score: { fontFamily: fonts.display, fontWeight: "800", fontSize: 40, lineHeight: 44, letterSpacing: -1.4, color: colors.ink },
  scoreCompact: { fontSize: 32, lineHeight: 36 },
  readMeta: { ...type.bodyStrong, fontSize: 14 },
  deltaRow: { flexDirection: "row", alignItems: "center", gap: 2, marginTop: 2 },
  delta: { ...type.meta, fontFamily: fonts.body, fontSize: 12.5, color: colors.inkMuted, marginTop: 2 },
  open: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.paper,
    alignItems: "center",
    justifyContent: "center",
  },
  ready: { position: "absolute", left: 0, fontFamily: fonts.mono, fontWeight: "400", fontSize: 10, color: colors.muted },
  value: {
    position: "absolute",
    width: 40,
    textAlign: "center",
    fontFamily: fonts.mono,
    fontWeight: "500",
    fontSize: 11,
    color: colors.ink,
  },
  hit: { position: "absolute", top: 0, bottom: 0 },
  empty: { alignItems: "center", paddingTop: 22 },
  pebbles: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  pebbleScore: { fontFamily: fonts.display, fontWeight: "800", fontSize: 28, letterSpacing: -0.8, color: colors.paper },
  emptyTitle: { ...type.heading, textAlign: "center", marginTop: 16 },
  emptyNote: {
    ...type.body,
    fontSize: 13.5,
    lineHeight: 19,
    color: colors.inkMuted,
    textAlign: "center",
    marginTop: 4,
    maxWidth: 280,
  },
  emptyAction: { alignSelf: "stretch", marginTop: 16 },
  axis: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  meta: { ...type.meta, fontFamily: fonts.body, fontSize: 11 },
});
