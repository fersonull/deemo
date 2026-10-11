import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { MODE_LABELS } from "@/constants";
import type { SessionSummary } from "@/hooks/use-sessions";
import { colors, fonts, radius, type } from "@/theme";
import { chartPoints, scoreY, segments, type Point } from "@/utils/chart";

const HEIGHT = 120;
const READY = 85; // "Defense-ready" band (addendum Q4)
const TIP_W = 132;
const GHOST = [34, 46, 41, 58, 66]; // the empty state's example line

const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

// Readiness over time (plan F15, S-13), oldest to newest. Drawn with Views; the build has no SVG.
// Tap a point for its score, stage and date (the newest is picked by the start). Fewer than two scored sessions
// show the empty state instead: a faint example line and what it takes to start a real one.
export function TrendChart({ sessions, stage }: { sessions: SessionSummary[]; stage: string | null }) {
  const [width, setWidth] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const scored = sessions.filter((s) => s.score !== undefined).reverse();
  const empty = scored.length < 2;
  const points = width ? chartPoints(empty ? GHOST : scored.map((s) => s.score ?? 0), width, HEIGHT) : [];
  const sel = Math.min(picked ?? scored.length - 1, scored.length - 1);
  const first = scored[0];
  const last = scored[scored.length - 1];
  const best = Math.max(...scored.map((s) => s.score ?? 0));

  return (
    <View style={styles.card}>
      <View style={styles.plot} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        <View style={[styles.ready, { top: scoreY(READY, HEIGHT) }]} />
        <Text style={[styles.readyLabel, { top: scoreY(READY, HEIGHT) - 15 }]}>{READY} · defense-ready</Text>
        {segments(points).map((g, i) => (
          <View
            key={`s${i}`}
            style={[
              styles.segment,
              empty && styles.ghost,
              { left: g.cx - g.length / 2, top: g.cy - 1, width: g.length, transform: [{ rotate: `${g.angle}deg` }] },
            ]}
          />
        ))}
        {empty ? null : (
          <>
            {points.map((p, i) => (
              <Pressable
                key={`p${i}`}
                accessibilityRole="button"
                accessibilityState={{ selected: i === sel }}
                accessibilityLabel={`${day(scored[i].createdAt)}, ${MODE_LABELS[scored[i].mode]}, readiness ${scored[i].score}`}
                onPress={() => setPicked(i)}
                hitSlop={4}
                style={[styles.hit, { left: p.x - 16, top: p.y - 16 }]}
              >
                <View style={[styles.dot, i === sel && styles.dotPicked]} />
              </Pressable>
            ))}
            {points[sel] ? <Tip at={points[sel]} width={width} s={scored[sel]} /> : null}
          </>
        )}
        {empty ? (
          <View style={styles.emptyText} pointerEvents="none">
            {scored.length === 1 ? (
              // One scored session: its score, and what's missing for a line.
              <>
                <Text style={styles.emptyTitle}>{scored[0].score} so far</Text>
                <Text style={styles.emptyNote}>One more scored session and your trend line appears.</Text>
              </>
            ) : (
              <>
                <Text style={styles.emptyTitle}>Your trend starts here</Text>
                <Text style={styles.emptyNote}>
                  {stage
                    ? `No scored ${stage} sessions yet.`
                    : "Finish two scored sessions to see your readiness over time."}
                </Text>
              </>
            )}
          </View>
        ) : null}
      </View>
      {empty ? null : (
        <View
          style={styles.axis}
          accessible
          accessibilityLabel={`Readiness went from ${first.score} on ${day(first.createdAt)} to ${last.score} on ${day(last.createdAt)}. Best ${best}.`}
        >
          <Text style={styles.meta}>{day(first.createdAt)}</Text>
          <Text style={styles.meta}>Best {best}</Text>
          <Text style={styles.meta}>{day(last.createdAt)}</Text>
        </View>
      )}
    </View>
  );
}

// The picked point's details, above it (below when it sits near the top), kept inside the plot.
function Tip({ at, width, s }: { at: Point; width: number; s: SessionSummary }) {
  const left = Math.min(Math.max(at.x - TIP_W / 2, 0), Math.max(0, width - TIP_W));
  const top = at.y > 44 ? at.y - 44 : at.y + 12;
  return (
    <View style={[styles.tip, { left, top }]} pointerEvents="none" accessibilityElementsHidden>
      <Text style={styles.tipScore}>{s.score}</Text>
      <Text style={styles.tipMeta} numberOfLines={1}>
        {MODE_LABELS[s.mode]} · {day(s.createdAt)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.sand, borderRadius: radius.xl, padding: 16, marginTop: 18 },
  plot: { height: HEIGHT },
  ready: { position: "absolute", left: 0, right: 0, height: 1, borderTopWidth: 1, borderStyle: "dashed", borderColor: colors.border },
  readyLabel: { position: "absolute", left: 0, fontFamily: fonts.mono, fontWeight: "500", fontSize: 10, color: colors.muted },
  segment: { position: "absolute", height: 2, borderRadius: 1, backgroundColor: colors.dusk },
  ghost: { backgroundColor: colors.border },
  hit: { position: "absolute", width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.dusk },
  // The picked point grows and gets a ring in the card color, so it reads apart from the line.
  dotPicked: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: colors.sand },
  tip: {
    position: "absolute",
    width: TIP_W,
    alignItems: "center",
    backgroundColor: colors.paper,
    borderRadius: radius.md,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  tipScore: { fontFamily: fonts.mono, fontWeight: "500", fontSize: 13, color: colors.ink },
  tipMeta: { ...type.meta, fontSize: 10.5, fontFamily: fonts.body },
  emptyText: { position: "absolute", left: 0, right: 0, top: 46, alignItems: "center", paddingHorizontal: 12 },
  emptyTitle: { ...type.bodyStrong, textAlign: "center" },
  emptyNote: { ...type.meta, textAlign: "center", marginTop: 2 },
  axis: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  meta: { ...type.meta, fontFamily: fonts.body },
});
