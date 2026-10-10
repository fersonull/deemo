import { router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "@/components/screen";
import { MODE_LABELS } from "@/constants";
import { sessions, useSessions, type SessionSummary } from "@/hooks/use-sessions";
import { colors, fonts, radius, type } from "@/theme";
import { formatTime } from "@/utils/format-time";

const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

function trend(list: SessionSummary[]) {
  const scored = list.filter((s) => s.score !== undefined);
  if (scored.length < 2) return "Every session you finish shows up here.";
  const diff = (scored[0].score ?? 0) - (scored[scored.length - 1].score ?? 0);
  if (diff > 0) return `Up ${diff} points since your first session.`;
  if (diff < 0) return `Down ${-diff} points since your first session. Keep practicing the flagged topics.`;
  return "Level with your first session.";
}

// History (plan S-13), list only for now; the trend chart and mode filters come later.
export function History() {
  const { list, loaded, error } = useSessions();

  useFocusEffect(
    useCallback(() => {
      void sessions.refresh();
    }, []),
  );

  return (
    <Screen scroll tabBar title="History" subtitle={trend(list)}>
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
        {loaded && error ? (
          <Text style={styles.note}>{"Can't reach the DEEMO server right now."}</Text>
        ) : loaded && list.length === 0 ? (
          <Text style={styles.note}>No sessions yet. Your first report will land here.</Text>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  list: { gap: 8, marginTop: 18 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.sand, borderRadius: radius.xl, padding: 16 },
  pressed: { opacity: 0.85 },
  mode: { ...type.heading, fontSize: 16 },
  meta: { ...type.meta, lineHeight: 17, marginTop: 2 },
  score: { fontFamily: fonts.display, fontWeight: "800", fontSize: 28, color: colors.ink, fontVariant: ["tabular-nums"] },
  pending: { color: colors.muted },
  note: { ...type.body, fontSize: 13, color: colors.inkMuted, paddingHorizontal: 4 },
});
