import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useDeferredValue, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";

import { Button } from "@/components/button";
import { DeemoNote } from "@/components/deemo-note";
import { Icon } from "@/components/icon";
import { Sheet } from "@/components/sheet";
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
import { RANGES, SORTS, arrangeSessions, type SessionRange, type SessionSort } from "@/utils/arrange-sessions";
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

// History (plan S-13): readiness over time, filterable by defense stage; the session list can also be sorted by date or
// score and narrowed to a date range (the chart stays chronological). Tap a row for its report.
export function History() {
  const reduced = useReducedMotion();
  const { list: all, loaded, error } = useSessions();
  // Opened from the Defense Path on a stage (?stage=PRE_ORAL): start filtered to it, and follow later taps.
  const { stage } = useLocalSearchParams<{ stage?: Mode }>();
  const [mode, setMode] = useState<Mode | null>(stage ?? null);
  const [lastStage, setLastStage] = useState(stage);
  if (stage !== lastStage) {
    setLastStage(stage);
    if (stage) setMode(stage);
  }
  const [sort, setSort] = useState<SessionSort>("newest");
  const [range, setRange] = useState<SessionRange>("all");
  const [arranging, setArranging] = useState(false);
  const filteredMode = useDeferredValue(mode);
  const filteredSort = useDeferredValue(sort);
  const filteredRange = useDeferredValue(range);
  const list = useMemo(() => filteredMode ? all.filter((s) => s.mode === filteredMode) : all, [all, filteredMode]);
  const shown = useMemo(() => arrangeSessions(list, filteredSort, filteredRange), [list, filteredSort, filteredRange]);
  const changed = sort !== "newest" || range !== "all";
  const arrangeLabel = [range !== "all" && RANGES.find((r) => r.value === range)!.label, SORTS.find((o) => o.value === sort)!.label]
    .filter(Boolean)
    .join(" · ");
  const { premium } = useSession();
  const summary = useMemo(() => historySummary(list, filteredMode ? MODE_LABELS[filteredMode] : null), [list, filteredMode]);

  // From an empty stage filter: open Setup on that stage. Final stays behind Setup's Premium lock on Free.
  const practiceStage = useCallback((m: Mode) => {
    if (m !== "FINAL" || premium) practiceSetup.set({ mode: m, weakFrom: null });
    router.push("/practice");
  }, [premium]);

  useFocusEffect(
    useCallback(() => {
      void sessions.refresh();
    }, []),
  );

  // Keep selection feedback urgent; reuse the chart and rows until the deferred filters catch up.
  const note = useMemo(() => loaded && !error ? (
    <Animated.View key={summary.text} entering={FadeIn.duration(220)} style={styles.summary}>
      <DeemoNote mood={summary.mood} size="m">{summary.text}</DeemoNote>
    </Animated.View>
  ) : null, [loaded, error, summary]);
  const chart = useMemo(() => loaded && !error ? (
    <TrendChart key={filteredMode ?? "all"} sessions={list} stage={filteredMode ? MODE_LABELS[filteredMode] : null}>
      {all.length === 0 ? (
        <StartButton label="Start practice" onPress={() => router.push("/practice")} />
      ) : filteredMode && list.length === 0 ? (
        <StartButton label={`Practice ${MODE_LABELS[filteredMode]}`} onPress={() => practiceStage(filteredMode)} />
      ) : null}
    </TrendChart>
  ) : null, [loaded, error, list, filteredMode, all.length, practiceStage]);
  const rows = useMemo(() => shown.map((s, i) => (
    <PressableScale
      scaleTo={0.98}
      entering={riseIn(Math.min(i, 5) * 40, reduced)}
      key={s.id}
      accessibilityRole="button"
      accessibilityHint="Opens the report"
      onPress={() => router.push({ pathname: "/results", params: { id: s.id } })}
      style={styles.row}
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
  )), [shown, reduced]);

  // Offline: Deemo takes the whole screen; nothing else here would work.
  if (loaded && error) return <Offline onRetry={refreshEverything} />;

  return (
    <Screen scroll tabBar title="History" onRefresh={refreshEverything}>
      {/* Deemo sums up the trend (it changes with the stage filter; the words fade in when they change) */}
      {note}
      {chart}
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
      {list.length ? (
        <View style={styles.listHead}>
          <Text style={[type.label, styles.flex]}>
            {shown.length === list.length ? `${list.length} SESSIONS` : `${shown.length} OF ${list.length} SESSIONS`}
          </Text>
          <PressableScale
            scaleTo={0.96}
            accessibilityRole="button"
            accessibilityLabel={`Sort and filter: ${arrangeLabel}`}
            onPress={() => setArranging(true)}
            style={[styles.arrange, changed && styles.arrangeOn]}
          >
            <Icon name="sort" size={18} color={changed ? colors.paper : colors.ink} />
            <Text style={[styles.arrangeText, changed && styles.onInk]} numberOfLines={1}>
              {arrangeLabel}
            </Text>
          </PressableScale>
        </View>
      ) : null}
      {list.length && !shown.length ? (
        <Text style={styles.none}>
          {"No sessions in this range. "}
          <Text style={styles.link} accessibilityRole="button" onPress={() => setRange("all")}>
            Show all time
          </Text>
        </Text>
      ) : null}
      <View style={styles.list} accessibilityState={{ busy: mode !== filteredMode || sort !== filteredSort || range !== filteredRange }}>
        {rows}
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

      <Sheet visible={arranging} onClose={() => setArranging(false)}>
        <Text style={styles.sheetTitle}>Sort and filter</Text>
        <Text style={[type.label, styles.group]}>SORT BY</Text>
        <Options options={SORTS} value={sort} onPick={setSort} label="Sort by" />
        <Text style={[type.label, styles.group]}>DATE</Text>
        <Options options={RANGES} value={range} onPick={setRange} label="Date range" />
        <View style={styles.sheetActions}>
          <View style={styles.flex}>
            <Button
              variant="secondary"
              label="Reset"
              disabled={!changed}
              onPress={() => {
                setSort("newest");
                setRange("all");
              }}
            />
          </View>
          <View style={styles.flex}>
            <Button label="Done" onPress={() => setArranging(false)} />
          </View>
        </View>
      </Sheet>
    </Screen>
  );
}

function Options<T extends string>({ options, value, onPick, label }: { options: { value: T; label: string }[]; value: T; onPick: (v: T) => void; label: string }) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.options}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            onPress={() => onPick(o.value)}
            style={[styles.chip, styles.optionChip, selected && styles.chipSelected]}
          >
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
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
  listHead: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 18, paddingLeft: 4 },
  arrange: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 36,
    maxWidth: "70%",
    borderRadius: 18,
    paddingHorizontal: 12,
    backgroundColor: colors.sand,
  },
  arrangeOn: { backgroundColor: colors.ink },
  arrangeText: { fontFamily: fonts.body, fontWeight: "600", fontSize: 13, color: colors.ink, flexShrink: 1 },
  onInk: { color: colors.paper },
  none: { ...type.body, fontSize: 13.5, color: colors.inkMuted, marginTop: 12, paddingHorizontal: 4 },
  link: { color: colors.duskLink, fontWeight: "600" },
  sheetTitle: { ...type.title, fontSize: 26, lineHeight: 28, letterSpacing: -0.8 },
  group: { marginTop: 18, marginBottom: 8 },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  optionChip: { height: 44, borderRadius: 22, paddingHorizontal: 16 },
  sheetActions: { flexDirection: "row", gap: 8, marginTop: 22 },
});
