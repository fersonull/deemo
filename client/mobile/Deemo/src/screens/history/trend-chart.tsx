import { useEffect, useRef, useState, type ReactNode } from "react";
import { StyleSheet, Text, View, type GestureResponderEvent } from "react-native";
import Animated, { useAnimatedProps, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";

import { Blob } from "@/components/blob";
import { Deemo } from "@/components/deemo";
import { Icon } from "@/components/icon";
import { MODE_LABELS } from "@/constants";
import type { SessionSummary } from "@/hooks/use-sessions";
import { colors, easeOut, fonts, radius, type } from "@/theme";
import {
  areaPath,
  chartPoints,
  linePath,
  nearestIndex,
  pathLength,
  scaleY,
  scoreDomain,
  type Box,
} from "@/utils/chart";

const HEIGHT = 150;
const READY = 85; // "Defense-ready" band (addendum Q4)
const TICKS = [50, 70, 85, 100]; // band edges
const MAX_DOTS = 12; // past this, only the picked point gets a dot
const BOX: Omit<Box, "width"> = { height: HEIGHT, left: 6, right: 30, top: 10, bottom: 10 };

const AnimatedPath = Animated.createAnimatedComponent(Path);

const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

// Readiness over time (plan F15, S-13), oldest to newest. One series, so no legend: the screen title names it.
// The readout above the plot shows the picked session (the newest to start): its score, stage, date and the
// change from the session before. Touch and drag along the plot to scrub; it snaps to sessions. The 85+ band is
// a soft wash; gridlines are solid hairlines at the band edges. The line draws itself in once (still with reduce
// motion). Fewer than two scored sessions show the empty state instead (Empty below), with `children` as its action.
type Props = { sessions: SessionSummary[]; stage: string | null; children?: ReactNode };

export function TrendChart({ sessions, stage, children }: Props) {
  const [width, setWidth] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const plot = useRef<View>(null);
  const plotX = useRef(0);
  const reduced = useReducedMotion();

  const scored = sessions.filter((s) => s.score !== undefined).reverse();
  const scores = scored.map((s) => s.score ?? 0);
  const domain = scoreDomain(scores);
  const box: Box = { ...BOX, width };
  const points = width ? chartPoints(scores, domain, box) : [];
  const length = pathLength(points);
  const sel = Math.min(picked ?? scored.length - 1, scored.length - 1);

  // Draw the line in once, when the plot first has a width.
  const drawn = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (width && !reduced) drawn.value = withTiming(1, { duration: 700, easing: easeOut });
  }, [width, reduced, drawn]);
  const drawing = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - drawn.value) }));
  const washing = useAnimatedProps(() => ({ fillOpacity: 0.1 * drawn.value }));

  if (scored.length < 2) return <Empty score={scored[0]?.score} stage={stage} action={children} />;

  const first = scored[0];
  const last = scored[scored.length - 1];
  const best = Math.max(...scores);
  const s = scored[sel];
  const delta = sel > 0 ? scores[sel] - scores[sel - 1] : null;
  const p = points[sel];

  const scrub = (e: GestureResponderEvent) => {
    if (points.length) setPicked(nearestIndex(points, e.nativeEvent.pageX - plotX.current));
  };

  return (
    <View style={styles.card}>
      {/* Readout: the picked session */}
      <View style={styles.readout} accessibilityLiveRegion="polite">
        <Text style={styles.score}>{s.score}</Text>
        <View style={styles.flex}>
          <Text style={styles.readMeta} numberOfLines={1}>
            {MODE_LABELS[s.mode]} · {day(s.createdAt)}
          </Text>
          <View style={styles.deltaRow}>
            {delta !== null && delta !== 0 ? (
              <Icon name={delta > 0 ? "trending_up" : "trending_down"} size={16} color={colors.inkMuted} />
            ) : null}
            <Text style={styles.delta} numberOfLines={1}>
              {delta === null
                ? "First scored session here"
                : delta === 0
                  ? "Same as the session before"
                  : `${delta > 0 ? "+" : "−"}${Math.abs(delta)} from the session before`}
            </Text>
          </View>
        </View>
      </View>

      <View
        ref={plot}
        style={styles.plot}
        onLayout={(e) => {
          setWidth(e.nativeEvent.layout.width);
          plot.current?.measure((_x, _y, _w, _h, pageX) => (plotX.current = pageX));
        }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(e) => {
          plot.current?.measure((_x, _y, _w, _h, pageX) => (plotX.current = pageX));
          scrub(e);
        }}
        onResponderMove={scrub}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={`Readiness trend, ${scored.length} sessions. Went from ${first.score} on ${day(first.createdAt)} to ${last.score} on ${day(last.createdAt)}. Best ${best}.`}
        accessibilityValue={{ text: `${s.score}, ${MODE_LABELS[s.mode]}, ${day(s.createdAt)}` }}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(e) =>
          setPicked(Math.max(0, Math.min(scored.length - 1, sel + (e.nativeEvent.actionName === "increment" ? 1 : -1))))
        }
      >
        {width ? (
          <Svg width={width} height={HEIGHT}>
            {/* Defense-ready band */}
            <Rect
              x={box.left}
              y={scaleY(100, domain, box)}
              width={width - box.left - box.right}
              height={scaleY(READY, domain, box) - scaleY(100, domain, box)}
              fill={colors.duskTint}
              opacity={0.6}
            />
            {TICKS.filter((t) => t >= domain[0]).map((t) => (
              <Line
                key={t}
                x1={box.left}
                x2={width - box.right}
                y1={scaleY(t, domain, box)}
                y2={scaleY(t, domain, box)}
                stroke={colors.border}
                strokeWidth={1}
              />
            ))}
            <AnimatedPath animatedProps={washing} d={areaPath(points, box)} fill={colors.dusk} fillOpacity={0.1} />
            {/* Crosshair, once the student has touched the chart (the newest point needs no pointer) */}
            {picked !== null ? (
              <Line x1={p.x} x2={p.x} y1={box.top} y2={HEIGHT - box.bottom} stroke={colors.duskSoft} strokeWidth={1} />
            ) : null}
            <AnimatedPath
              animatedProps={drawing}
              d={linePath(points)}
              stroke={colors.dusk}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={[length, length]}
              fill="none"
            />
            {points.map((q, i) =>
              i === sel || points.length <= MAX_DOTS ? (
                <Circle
                  key={i}
                  cx={q.x}
                  cy={q.y}
                  r={i === sel ? 6 : 4}
                  fill={colors.dusk}
                  stroke={colors.sand}
                  strokeWidth={2}
                />
              ) : null,
            )}
          </Svg>
        ) : null}
        {/* Tick labels in the right gutter; text wears text tokens */}
        {width
          ? TICKS.filter((t) => t >= domain[0]).map((t) => (
              <Text key={t} style={[styles.tick, { top: scaleY(t, domain, box) - 7 }]}>
                {t}
              </Text>
            ))
          : null}
        {width ? (
          <Text style={[styles.band, { top: scaleY(100, domain, box) + 3, left: box.left + 6 }]}>Defense-ready</Text>
        ) : null}
      </View>

      <View style={styles.axis} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Text style={styles.meta}>{day(first.createdAt)}</Text>
        <Text style={styles.meta}>
          {scored.length} sessions · best {best}
        </Text>
        <Text style={styles.meta}>{day(last.createdAt)}</Text>
      </View>
    </View>
  );
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
  readout: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  score: { fontFamily: fonts.display, fontWeight: "800", fontSize: 40, lineHeight: 44, letterSpacing: -1.4, color: colors.ink },
  readMeta: { ...type.bodyStrong, fontSize: 14 },
  deltaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  delta: { ...type.meta, fontFamily: fonts.body, fontSize: 12.5, color: colors.inkMuted },
  plot: { height: HEIGHT },
  tick: {
    position: "absolute",
    right: 0,
    width: 26,
    textAlign: "right",
    fontFamily: fonts.mono,
    fontWeight: "400",
    fontSize: 10,
    color: colors.muted,
    fontVariant: ["tabular-nums"],
  },
  band: { position: "absolute", fontFamily: fonts.body, fontWeight: "500", fontSize: 10.5, color: colors.duskInk },
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
  axis: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  meta: { ...type.meta, fontFamily: fonts.body },
});
