import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { DeemoNote } from "@/components/deemo-note";
import { Screen } from "@/components/screen";
import { Skeleton } from "@/components/skeleton";
import { StartButton } from "@/components/start-button";
import { MODE_LABELS, type Mode } from "@/constants";
import { practiceSetup } from "@/hooks/use-practice-setup";
import { useSession } from "@/hooks/use-session";
import { sessions, useSessions, type SessionSummary } from "@/hooks/use-sessions";
import { colors, fonts, radius, type } from "@/theme";
import { formatTime } from "@/utils/format-time";

import { TrendChart } from "./trend-chart";

const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

function trend(list: SessionSummary[]) {
  const scored = list.filter((s) => s.score !== undefined);
  if (!list.length) return "No practice yet.";
  if (scored.length < 2) return scored.length ? "One scored session so far." : "No scored sessions yet.";
  const diff = (scored[0].score ?? 0) - (scored[scored.length - 1].score ?? 0);
  if (diff > 0) return `Up ${diff} points since your first session.`;
  if (diff < 0) return `Down ${-diff} points since your first session. Keep practicing the flagged topics.`;
  return "Level with your first session.";
}

const FILTERS: { label: string; mode: Mode | null }[] = [
  { label: "All", mode: null },
  { label: "Title", mode: "TITLE" },
  { label: "Pre-Oral", mode: "PRE_ORAL" },
  { label: "Final", mode: "FINAL" },
];

// History (plan S-13): readiness over time, filterable by defense stage; tap a row for its report.
export function History() {
  const { list: all, loaded, error } = useSessions();
  const [mode, setMode] = useState<Mode | null>(null);
  const list = mode ? all.filter((s) => s.mode === mode) : all;
  const { premium } = useSession();

  // From an empty stage filter: open Setup on that stage. Final stays behind Setup's Premium lock on Free.
  const practiceStage = (m: Mode) => {
    if (m !== "FINAL" || premium) practiceSetup.set({ mode: m, weakFrom: null });
    router.push("/practice");
  };

  useFocusEffect(
    useCallback(() => {
      void sessions.refresh();
    }, []),
  );

  return (
    <Screen scroll tabBar title="History" subtitle={trend(list)} onRefresh={sessions.refresh}>
      {loaded && !error ? (
        <TrendChart key={mode ?? "all"} sessions={list} stage={mode ? MODE_LABELS[mode] : null}>
          {/* The empty card's action: start practicing, or practice the filtered stage. */}
          {all.length === 0 ? (
            <StartButton label="Start practice" onPress={() => router.push("/practice")} />
          ) : mode && list.length === 0 ? (
            <StartButton label={`Practice ${MODE_LABELS[mode]}`} onPress={() => practiceStage(mode)} />
          ) : null}
        </TrendChart>
      ) : null}
      {all.length ? (
        <View accessibilityRole="radiogroup" accessibilityLabel="Defense stage" style={styles.filters}>
          {FILTERS.map((f) => {
            const selected = f.mode === mode;
            return (
              <Pressable
                key={f.label}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                onPress={() => setMode(f.mode)}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{f.label}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      <View style={styles.list}>
        {list.map((s) => (
          <Pressable
            key={s.id}
            accessibilityRole="button"
            accessibilityHint="Opens the report"
            onPress={() => router.push({ pathname: "/results", params: { id: s.id } })}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <View style={styles.flex}>
              <Text style={styles.mode}>{MODE_LABELS[s.mode]}</Text>
              <Text style={styles.meta} numberOfLines={1}>
                {day(s.createdAt)} · {formatTime(s.durationMs)} · {s.title}
              </Text>
            </View>
            <Text style={[styles.score, s.score === undefined && styles.pending]}>
              {s.score ?? (s.status === "scoring" ? "…" : "–")}
            </Text>
          </Pressable>
        ))}
        {!loaded ? (
          <Skeleton label="Loading your sessions">
            <View style={styles.list}>
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={styles.row}>
                  <View style={[styles.flex, styles.bones]}>
                    <Skeleton.Bone width="35%" height={15} />
                    <Skeleton.Bone width="70%" height={11} />
                  </View>
                  <Skeleton.Bone width={38} height={28} />
                </View>
              ))}
            </View>
          </Skeleton>
        ) : error ? (
          <DeemoNote mood="sleepy">{"Can't reach the DEEMO server right now. Pull down to try again."}</DeemoNote>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  list: { gap: 8, marginTop: 14 },
  bones: { gap: 8 },
  filters: { flexDirection: "row", gap: 6, marginTop: 16 },
  chip: { height: 34, borderRadius: 17, paddingHorizontal: 14, justifyContent: "center", backgroundColor: colors.sand },
  chipSelected: { backgroundColor: colors.ink },
  chipText: { fontFamily: fonts.body, fontWeight: "600", fontSize: 13, color: colors.ink },
  chipTextSelected: { color: colors.paper },
  row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.sand, borderRadius: radius.xl, padding: 16 },
  pressed: { opacity: 0.85 },
  mode: { ...type.heading, fontSize: 16 },
  meta: { ...type.meta, lineHeight: 17, marginTop: 2 },
  score: { fontFamily: fonts.display, fontWeight: "800", fontSize: 28, color: colors.ink, fontVariant: ["tabular-nums"] },
  pending: { color: colors.muted },
});
