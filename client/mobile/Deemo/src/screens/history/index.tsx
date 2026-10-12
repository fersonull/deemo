import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";

import { DeemoNote } from "@/components/deemo-note";
import { Screen } from "@/components/screen";
import { Skeleton } from "@/components/skeleton";
import { StartButton } from "@/components/start-button";
import { PressableScale } from "@/components/pressable-scale";
import { Score } from "@/components/score";
import { Offline } from "@/components/offline";
import { MODE_LABELS, type Mode } from "@/constants";
import { practiceSetup } from "@/hooks/use-practice-setup";
import { refreshEverything } from "@/hooks/refresh-everything";
import { useSession } from "@/hooks/use-session";
import { sessions, useSessions } from "@/hooks/use-sessions";
import { colors, fonts, radius, type } from "@/theme";
import { formatTime } from "@/utils/format-time";
import { historySummary } from "@/utils/history-summary";
import { riseIn } from "@/utils/motion";

import { TrendChart } from "./trend-chart";

const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });


const FILTERS: { label: string; mode: Mode | null }[] = [
  { label: "All", mode: null },
  { label: "Title", mode: "TITLE" },
  { label: "Pre-Oral", mode: "PRE_ORAL" },
  { label: "Final", mode: "FINAL" },
];

// History (plan S-13): readiness over time, filterable by defense stage; tap a row for its report.
export function History() {
  const reduced = useReducedMotion();
  const { list: all, loaded, error } = useSessions();
  const [mode, setMode] = useState<Mode | null>(null);
  const list = mode ? all.filter((s) => s.mode === mode) : all;
  const { premium } = useSession();
  const summary = historySummary(list, mode ? MODE_LABELS[mode] : null);

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

  // Offline: Deemo takes the whole screen; nothing else here would work.
  if (loaded && error) return <Offline onRetry={refreshEverything} />;

  return (
    <Screen scroll tabBar title="History" onRefresh={refreshEverything}>
      {/* Deemo sums up the trend (it changes with the stage filter; the words fade in when they change) */}
      {loaded && !error ? (
        <Animated.View key={summary.text} entering={FadeIn.duration(220)} style={styles.summary}>
          <DeemoNote mood={summary.mood} size="m">
            {summary.text}
          </DeemoNote>
        </Animated.View>
      ) : null}
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
        {list.map((s, i) => (
          <PressableScale
            scaleTo={0.98}
            entering={riseIn(Math.min(i, 5) * 40, reduced)}
            key={s.id}
            accessibilityRole="button"
            accessibilityHint="Opens the report"
            onPress={() => router.push({ pathname: "/results", params: { id: s.id } })}
            style={[styles.row]}
          >
            <View style={styles.flex}>
              <Text style={styles.mode}>{MODE_LABELS[s.mode]}</Text>
              <Text style={styles.meta} numberOfLines={1}>
                {day(s.createdAt)} · {formatTime(s.durationMs)} · {s.title}
              </Text>
            </View>
            {s.score !== undefined ? (
              <Score value={s.score} style={styles.score} caption banded align="right" />
            ) : (
              <Text style={[styles.score, styles.pending]}>{s.status === "scoring" ? "…" : "–"}</Text>
            )}
          </PressableScale>
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
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { marginTop: 14 },
  flex: { flex: 1, minWidth: 0 },
  list: { gap: 8, marginTop: 14 },
  bones: { gap: 8 },
  filters: { flexDirection: "row", gap: 6, marginTop: 16 },
  chip: { height: 34, borderRadius: 17, paddingHorizontal: 14, justifyContent: "center", backgroundColor: colors.sand },
  chipSelected: { backgroundColor: colors.ink },
  chipText: { fontFamily: fonts.body, fontWeight: "600", fontSize: 13, color: colors.ink },
  chipTextSelected: { color: colors.paper },
  row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.sand, borderRadius: radius.xl, padding: 16 },
  mode: { ...type.heading, fontSize: 16 },
  meta: { ...type.meta, lineHeight: 17, marginTop: 2 },
  score: { fontFamily: fonts.display, fontWeight: "800", fontSize: 26, letterSpacing: -0.6, color: colors.ink },
  pending: { color: colors.muted },
});
