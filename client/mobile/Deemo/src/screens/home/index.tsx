import { router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Blob } from "@/components/blob";
import { Icon } from "@/components/icon";
import { MODE_LABELS, type Mode } from "@/constants";
import { usePracticeSetup } from "@/hooks/use-practice-setup";
import { useProjects } from "@/hooks/use-projects";
import { useSession } from "@/hooks/use-session";
import { sessions, useSessions } from "@/hooks/use-sessions";
import { colors, fonts, type } from "@/theme";
import { initials } from "@/utils/initials";

const MODE_INITIALS: Record<Mode, string> = { TITLE: "T", PRE_ORAL: "PO", FINAL: "F" };
const MODE_BG: Record<Mode, string> = { TITLE: colors.sand, PRE_ORAL: colors.duskTint, FINAL: colors.sageTint };

function greeting(hour: number) {
  if (hour < 12) return "Morning";
  if (hour < 18) return "Afternoon";
  return "Evening";
}

const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

// Home (plan S-05, prototype home): greeting, the last readiness score, Start practice, recent sessions.
// ponytail: the design's group readiness card waits for group projects (addendum Q10).
export function Home() {
  const { name, email } = useSession();
  const { list } = useSessions();
  const { projectId } = usePracticeSetup();
  const manuscript = useProjects().projects.find((p) => p.id === projectId);
  const first = name?.trim().split(/\s+/)[0];
  const last = list.find((s) => s.score !== undefined);
  const recent = list.slice(0, 3);

  useFocusEffect(
    useCallback(() => {
      void sessions.refresh();
    }, []),
  );

  const open = (id: string) => router.push({ pathname: "/results", params: { id } });

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.head}>
          <Text accessibilityRole="header" style={[type.hero, styles.flex]}>
            {first ? `${greeting(new Date().getHours())},\n${first}.` : `${greeting(new Date().getHours())}.`}
          </Text>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(name, email)}</Text>
          </View>
        </View>
        <Text style={styles.sub}>
          {manuscript
            ? `Your panel has read ${manuscript.name}. Up for a round?`
            : "Add your manuscript so the panel asks about your own study."}
        </Text>

        {last ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Last readiness ${last.score}, ${last.band}. Opens the report.`}
            onPress={() => open(last.id)}
            style={({ pressed }) => [styles.last, pressed && styles.pressed]}
          >
            <Blob width={76} height={66}>
              <Text style={styles.lastScore}>{last.score}</Text>
            </Blob>
            <View style={styles.flex}>
              <Text style={styles.lastBand}>{last.band}</Text>
              <Text style={styles.lastTip} numberOfLines={2}>
                {last.tip ?? `${MODE_LABELS[last.mode]} · ${day(last.createdAt)}`}
              </Text>
            </View>
            <Icon name="chevron_right" size={20} color={colors.muted} />
          </Pressable>
        ) : null}

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(manuscript || list.length ? "/practice" : "/projects")}
          style={({ pressed }) => [styles.start, pressed && styles.pressed]}
        >
          <Text style={[type.button, styles.startLabel]}>{manuscript || list.length ? "Start practice" : "Add your manuscript"}</Text>
          <Blob width={44} height={44}>
            <Icon name={manuscript || list.length ? "mic" : "upload_file"} size={22} color={colors.paper} filled />
          </Blob>
        </Pressable>
        {!manuscript && !list.length ? (
          <Pressable accessibilityRole="button" onPress={() => router.push("/practice")} style={styles.sample}>
            <Text style={styles.sampleText}>Or practice with a sample paper</Text>
          </Pressable>
        ) : null}

        {recent.length ? (
          <>
            <Text style={[type.label, styles.section]}>RECENT</Text>
            {recent.map((s) => (
              <Pressable
                key={s.id}
                accessibilityRole="button"
                accessibilityHint="Opens the report"
                onPress={() => open(s.id)}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                <View style={[styles.mode, { backgroundColor: MODE_BG[s.mode] }]}>
                  <Text style={styles.modeText}>{MODE_INITIALS[s.mode]}</Text>
                </View>
                <View style={styles.flex}>
                  <Text style={styles.rowTitle}>{MODE_LABELS[s.mode]}</Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {day(s.createdAt)} · {s.title}
                  </Text>
                </View>
                <Text style={styles.rowScore}>{s.score ?? (s.status === "scoring" ? "…" : "–")}</Text>
              </Pressable>
            ))}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  scroll: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 120 },
  flex: { flex: 1, minWidth: 0 },
  head: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.duskTint, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: fonts.body, fontWeight: "600", fontSize: 14, color: colors.duskInk },
  sub: { ...type.body, color: colors.inkMuted, marginTop: 8 },
  last: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: colors.sand, borderRadius: 24, padding: 16, marginTop: 18 },
  lastScore: { fontFamily: fonts.display, fontWeight: "800", fontSize: 28, letterSpacing: -0.8, color: colors.paper },
  lastBand: { ...type.heading },
  lastTip: { ...type.body, fontSize: 13, lineHeight: 18, color: colors.inkMuted, marginTop: 3 },
  start: {
    height: 60,
    marginTop: 10,
    borderRadius: 30,
    backgroundColor: colors.ink,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingLeft: 22,
    paddingRight: 8,
  },
  startLabel: { flex: 1, color: colors.paper },
  sample: { height: 44, alignItems: "center", justifyContent: "center", marginTop: 4 },
  sampleText: { fontFamily: fonts.body, fontWeight: "600", fontSize: 14, color: colors.duskLink },
  pressed: { opacity: 0.85 },
  section: { marginTop: 24, marginBottom: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, height: 58 },
  mode: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  modeText: { fontFamily: fonts.body, fontWeight: "600", fontSize: 13, color: colors.ink },
  rowTitle: { fontFamily: fonts.body, fontWeight: "500", fontSize: 14.5, color: colors.ink },
  meta: { ...type.meta, marginTop: 2 },
  rowScore: { fontFamily: fonts.mono, fontWeight: "500", fontSize: 15, color: colors.ink },
});
