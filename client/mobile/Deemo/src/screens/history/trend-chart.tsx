import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import type { SessionSummary } from "@/hooks/use-sessions";
import { colors, fonts, radius, type } from "@/theme";
import { chartPoints, scoreY, segments } from "@/utils/chart";

const HEIGHT = 120;
const READY = 85; // "Defense-ready" band (addendum Q4)

const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

// Readiness over time (plan F15, S-13), oldest to newest. Drawn with Views; the build has no SVG.
export function TrendChart({ sessions }: { sessions: SessionSummary[] }) {
  const [width, setWidth] = useState(0);
  const scored = sessions.filter((s) => s.score !== undefined).reverse();
  const points = width ? chartPoints(scored.map((s) => s.score ?? 0), width, HEIGHT) : [];
  const first = scored[0];
  const last = scored[scored.length - 1];

  if (scored.length < 2) return null;

  return (
    <View
      style={styles.card}
      accessible
      accessibilityLabel={`Readiness went from ${first.score} on ${day(first.createdAt)} to ${last.score} on ${day(last.createdAt)}.`}
    >
      <View style={styles.plot} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        <View style={[styles.ready, { top: scoreY(READY, HEIGHT) }]} />
        {segments(points).map((g, i) => (
          <View
            key={`s${i}`}
            style={[
              styles.segment,
              { left: g.cx - g.length / 2, top: g.cy - 1.5, width: g.length, transform: [{ rotate: `${g.angle}deg` }] },
            ]}
          />
        ))}
        {points.map((p, i) => {
          const end = i === points.length - 1;
          const r = end ? 6 : 3.5;
          return <View key={`p${i}`} style={[styles.dot, { left: p.x - r, top: p.y - r, width: r * 2, height: r * 2, borderRadius: r }]} />;
        })}
      </View>
      <View style={styles.axis}>
        <Text style={styles.meta}>{day(first.createdAt)}</Text>
        <Text style={styles.meta}>
          {last.score} · {last.band?.toLowerCase()}
        </Text>
        <Text style={styles.meta}>{day(last.createdAt)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.sand, borderRadius: radius.xl, padding: 16, marginTop: 18 },
  plot: { height: HEIGHT },
  ready: { position: "absolute", left: 0, right: 0, height: 1, borderTopWidth: 1, borderStyle: "dashed", borderColor: colors.border },
  segment: { position: "absolute", height: 3, borderRadius: 1.5, backgroundColor: colors.dusk },
  dot: { position: "absolute", backgroundColor: colors.dusk },
  axis: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  meta: { ...type.meta, fontFamily: fonts.body },
});
