import { router } from "expo-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Line, Path, Rect } from "react-native-svg";

import { Blob } from "@/components/blob";
import { Deemo } from "@/components/deemo";
import { Icon } from "@/components/icon";
import { PressableScale } from "@/components/pressable-scale";
import { MODE_LABELS } from "@/constants";
import type { SessionSummary } from "@/hooks/use-sessions";
import { colors, easeOut, fonts, radius, type } from "@/theme";
import { columnPath, columns, contentWidth, scoreY, type Box, type Column } from "@/utils/chart";

const HEIGHT = 150;
const READY = 85; // "Defense-ready" band (addendum Q4)
const TICKS = [0, 50, 70, 85, 100]; // the baseline and the band edges
const GUTTER = 30; // tick labels, right of the plot
const BOX: Box = { height: HEIGHT, top: 18, bottom: 1 }; // room above for the picked column's value

const AnimatedPath = Animated.createAnimatedComponent(Path);

const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

// Readiness per session (plan F15, S-13): one column each, oldest to newest, growing from 0. One series, so no
// legend: the screen title names it. Tap a column to preview it in the readout above (score, stage, date, change
// since the session before) and open its report from there; the newest is picked to start. The 85+ band is a soft
// wash, gridlines are solid hairlines at the band edges. Many sessions scroll sideways, starting at the newest.
// Columns grow in once (still with reduce motion). Fewer than two scored sessions show the empty state instead
// (Empty below), with `children` as its action.
type Props = { sessions: SessionSummary[]; stage: string | null; children?: ReactNode };

export function TrendChart({ sessions, stage, children }: Props) {
  const [visible, setVisible] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const reduced = useReducedMotion();
  const scroller = useRef<ScrollView>(null);
  const atEnd = useRef(false);

  const scored = sessions.filter((s) => s.score !== undefined).reverse();
  const scores = scored.map((s) => s.score ?? 0);
  const width = contentWidth(scored.length, visible);
  const cols = visible ? columns(scores, width, BOX) : [];
  const sel = Math.min(picked ?? scored.length - 1, scored.length - 1);

  // Grow the columns in once, when the plot first has a width.
  const grown = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (visible && !reduced) grown.value = withTiming(1, { duration: 500, easing: easeOut });
  }, [visible, reduced, grown]);

  if (scored.length < 2) return <Empty score={scored[0]?.score} stage={stage} action={children} />;

  const first = scored[0];
  const last = scored[scored.length - 1];
  const best = Math.max(...scores);
  const s = scored[sel];
  const delta = sel > 0 ? scores[sel] - scores[sel - 1] : null;
  const c = cols[sel];

  return (
    <View style={styles.card}>
      {/* Readout: the picked session, with its report one tap away */}
      <View style={styles.readout} accessibilityLiveRegion="polite">
        <Text style={styles.score}>{s.score}</Text>
        <View style={styles.flex}>
          <Text style={styles.readMeta} numberOfLines={1}>
            {MODE_LABELS[s.mode]} · {day(s.createdAt)}
          </Text>
          <View style={styles.deltaRow}>
            {delta ? <Icon name={delta > 0 ? "trending_up" : "trending_down"} size={16} color={colors.inkMuted} /> : null}
            <Text style={styles.delta} numberOfLines={1}>
              {delta === null
                ? "First one here"
                : delta === 0
                  ? "Same as last time"
                  : `${delta > 0 ? "+" : "−"}${Math.abs(delta)} since last`}
            </Text>
          </View>
        </View>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`Open the ${MODE_LABELS[s.mode]} report from ${day(s.createdAt)}`}
          hitSlop={8}
          onPress={() => router.push({ pathname: "/results", params: { id: s.id } })}
          style={[styles.open]}
        >
          <Text style={styles.openText}>Report</Text>
          <Icon name="chevron_right" size={18} color={colors.duskLink} />
        </PressableScale>
      </View>

      <View style={styles.plotRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.flex}
          ref={scroller}
          onLayout={(e) => setVisible(e.nativeEvent.layout.width)}
          // Start at the newest sessions, once; after that the student's own scrolling stays put.
          onContentSizeChange={() => {
            if (atEnd.current || !visible) return;
            atEnd.current = true;
            scroller.current?.scrollToEnd({ animated: false });
          }}
        >
          {visible ? (
            <View style={{ width, height: HEIGHT }}>
              <Svg width={width} height={HEIGHT}>
                {/* Defense-ready band */}
                <Rect
                  x={0}
                  y={scoreY(100, BOX)}
                  width={width}
                  height={scoreY(READY, BOX) - scoreY(100, BOX)}
                  fill={colors.duskTint}
                  opacity={0.6}
                />
                {TICKS.map((t) => (
                  <Line
                    key={t}
                    x1={0}
                    x2={width}
                    y1={scoreY(t, BOX)}
                    y2={scoreY(t, BOX)}
                    stroke={colors.border}
                    strokeWidth={1}
                  />
                ))}
                {cols.map((col, i) => (
                  <Bar key={i} col={col} grown={grown} color={i === sel ? colors.duskInk : colors.dusk} />
                ))}
              </Svg>
              {/* The picked column's value rides its top (the only number in the plot) */}
              {c ? (
                <Text style={[styles.value, { left: Math.min(Math.max(c.x + c.width / 2 - 20, 0), width - 40), top: c.y - 17 }]}>{s.score}</Text>
              ) : null}
              {/* Tap targets: the whole slot, taller and wider than the column */}
              {cols.map((col, i) => (
                <Pressable
                  key={i}
                  accessibilityRole="button"
                  accessibilityState={{ selected: i === sel }}
                  accessibilityLabel={`${MODE_LABELS[scored[i].mode]}, ${day(scored[i].createdAt)}, readiness ${scored[i].score}`}
                  accessibilityHint="Shows this session above"
                  onPress={() => setPicked(i)}
                  style={[styles.hit, { left: (i * width) / cols.length, width: width / cols.length }]}
                />
              ))}
            </View>
          ) : null}
        </ScrollView>
        <View style={styles.gutter} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {TICKS.filter((t) => t > 0).map((t) => (
            <Text key={t} style={[styles.tick, { top: scoreY(t, BOX) - 7 }]}>
              {t}
            </Text>
          ))}
        </View>
      </View>

      <View style={styles.key} accessible accessibilityLabel="Shaded band: defense-ready, 85 and up">
        <View style={styles.swatch} />
        <Text style={styles.meta}>Defense-ready, 85 and up</Text>
      </View>
      <View
        style={styles.axis}
        accessible
        accessibilityLabel={`${scored.length} sessions from ${day(first.createdAt)} to ${day(last.createdAt)}. Best ${best}.`}
      >
        <Text style={styles.meta}>{day(first.createdAt)}</Text>
        <Text style={styles.meta}>
          {scored.length} sessions · best {best}
        </Text>
        <Text style={styles.meta}>{day(last.createdAt)}</Text>
      </View>
    </View>
  );
}

// One column, growing up from the baseline.
function Bar({ col, grown, color }: { col: Column; grown: SharedValue<number>; color: string }) {
  const growing = useAnimatedProps(() => ({ d: columnPath(col, grown.value) }));
  return <AnimatedPath animatedProps={growing} d={columnPath(col)} fill={color} />;
}

// Fewer than two scored sessions: pebbles stepping up like the trend to come, Deemo on top (or the one score
// so far), then what it takes to draw the line.
function Empty({ score, stage, action }: { score?: number; stage: string | null; action?: ReactNode }) {
  const title = score !== undefined ? `${score} so far` : stage ? `No ${stage} scores yet` : "Your trend starts here";
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
            <Text style={styles.pebbleScore}>{score}</Text>
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
  readout: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  score: { fontFamily: fonts.display, fontWeight: "800", fontSize: 40, lineHeight: 44, letterSpacing: -1.4, color: colors.ink },
  readMeta: { ...type.bodyStrong, fontSize: 14 },
  deltaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  delta: { ...type.meta, fontFamily: fonts.body, fontSize: 12.5, color: colors.inkMuted },
  open: { flexDirection: "row", alignItems: "center", minHeight: 44, paddingLeft: 8 },
  openText: { fontFamily: fonts.body, fontWeight: "600", fontSize: 13.5, color: colors.duskLink },
  plotRow: { flexDirection: "row", height: HEIGHT },
  gutter: { width: GUTTER },
  tick: {
    position: "absolute",
    right: 0,
    width: GUTTER - 4,
    textAlign: "right",
    fontFamily: fonts.mono,
    fontWeight: "400",
    fontSize: 10,
    color: colors.muted,
    fontVariant: ["tabular-nums"],
  },
  key: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  swatch: { width: 12, height: 8, borderRadius: 2, backgroundColor: colors.duskTint },
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
  meta: { ...type.meta, fontFamily: fonts.body },
});
