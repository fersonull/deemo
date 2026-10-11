import { router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Blob } from "@/components/blob";
import { Deemo } from "@/components/deemo";
import { DeemoNote } from "@/components/deemo-note";
import { Icon } from "@/components/icon";
import { Skeleton } from "@/components/skeleton";
import { StartButton } from "@/components/start-button";
import { MODE_LABELS, type Mode } from "@/constants";
import { usePracticeSetup } from "@/hooks/use-practice-setup";
import { usePullRefresh } from "@/hooks/use-pull-refresh";
import { projects, useProjects } from "@/hooks/use-projects";
import { useSession } from "@/hooks/use-session";
import { sessions, useSessions } from "@/hooks/use-sessions";
import { colors, fonts, type } from "@/theme";
import { initials } from "@/utils/initials";
import { GroupReadiness } from "./group-readiness";

const STEPS = ["Add your manuscript", "Practice one round", "See your readiness report"];
const MODE_INITIALS: Record<Mode, string> = { TITLE: "T", PRE_ORAL: "PO", FINAL: "F" };
const MODE_BG: Record<Mode, string> = { TITLE: colors.sand, PRE_ORAL: colors.duskTint, FINAL: colors.sageTint };

function greeting(hour: number) {
  if (hour < 12) return "Morning";
  if (hour < 18) return "Afternoon";
  return "Evening";
}

const reload = () => Promise.all([sessions.refresh(), projects.refresh()]);

const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

// Home (plan S-05, prototype home): greeting, the last readiness score, Start practice, recent sessions.
export function Home() {
  const { name, email } = useSession();
  const { list, loaded, error } = useSessions();
  const { projectId } = usePracticeSetup();
  const { projects: mine, loaded: projectsLoaded } = useProjects();
  const manuscript = mine.find((p) => p.id === projectId);
  // Until both lists arrive, assume a returning student: no "Add your manuscript" flash.
  const practiced = !!manuscript || list.length > 0 || !loaded || !projectsLoaded;
  const first = name?.trim().split(/\s+/)[0];
  const last = list.find((s) => s.score !== undefined);
  const recent = list.slice(0, 3);

  useFocusEffect(
    useCallback(() => {
      void sessions.refresh();
      void projects.refresh();
    }, []),
  );

  const open = (id: string) => router.push({ pathname: "/results", params: { id } });
  const refresh = usePullRefresh(reload);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} refreshControl={refresh}>
        <View style={styles.head}>
          <Text accessibilityRole="header" style={[type.hero, styles.flex]}>
            {first ? `${greeting(new Date().getHours())},\n${first}.` : `${greeting(new Date().getHours())}.`}
          </Text>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(name, email)}</Text>
          </View>
        </View>
        {projectsLoaded ? (
          <Text style={styles.sub}>
            {manuscript
              ? `Your panel has read ${manuscript.name}. Up for a round?`
              : "Add your manuscript so the panel asks about your own study."}
          </Text>
        ) : (
          <Skeleton label="Loading your manuscript">
            <Skeleton.Bone width="80%" height={14} style={styles.subBone} />
          </Skeleton>
        )}

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
        ) : !loaded ? (
          <Skeleton label="Loading your last score">
            <View style={styles.last}>
              <Skeleton.Bone width={76} height={66} radius={30} />
              <View style={[styles.flex, styles.bones]}>
                <Skeleton.Bone width="55%" height={16} />
                <Skeleton.Bone width="85%" height={12} />
              </View>
            </View>
          </Skeleton>
        ) : error ? (
          // Offline: say so, rather than "No score yet" to a student who has scores.
          <DeemoNote mood="sleepy" style={styles.offline}>
            {"Can't reach the DEEMO server right now. Pull down to try again."}
          </DeemoNote>
        ) : (
          // No score yet: the same card, holding the place the score will take.
          <View style={styles.last} accessible accessibilityLabel="No readiness score yet">
            <Deemo />
            <View style={styles.flex}>
              <Text style={styles.lastBand}>No score yet</Text>
              <Text style={styles.lastTip}>
                {list.length
                  ? "Answer at least one question and your score shows up here."
                  : "Your readiness score shows up here after your first practice."}
              </Text>
            </View>
          </View>
        )}

        <StartButton
          label={practiced ? "Start practice" : "Add your manuscript"}
          icon={practiced ? "mic" : "upload_file"}
          onPress={() => router.push(practiced ? "/practice" : "/projects")}
          style={styles.start}
        />
        {!practiced ? (
          <Pressable accessibilityRole="button" onPress={() => router.push("/practice")} style={styles.sample}>
            <Text style={styles.sampleText}>Or practice with a sample paper</Text>
          </Pressable>
        ) : null}

        <GroupReadiness />
        {!loaded ? (
          <>
            <Text style={[type.label, styles.section]}>RECENT</Text>
            <Skeleton label="Loading recent sessions">
              {[0, 1, 2].map((i) => (
                <View key={i} style={styles.row}>
                  <Skeleton.Bone width={38} height={38} radius={19} />
                  <View style={[styles.flex, styles.bones]}>
                    <Skeleton.Bone width="35%" height={13} />
                    <Skeleton.Bone width="75%" height={11} />
                  </View>
                  <Skeleton.Bone width={22} height={15} />
                </View>
              ))}
            </Skeleton>
          </>
        ) : error ? null : !recent.length ? (
          // First visit: what gets you from here to a report. Steps, not buttons; Start practice is right above.
          <>
            <Text style={[type.label, styles.section]}>GET STARTED</Text>
            {STEPS.map((step, i) => {
              const done = i === 0 && !!manuscript;
              return (
                <View key={step} style={styles.row} accessible accessibilityLabel={`${step}${done ? ", done" : ""}`}>
                  <Icon
                    name={done ? "check_circle" : "radio_button_unchecked"}
                    size={22}
                    color={done ? colors.sage : colors.muted}
                    filled={done}
                  />
                  <Text style={[styles.rowTitle, styles.flex, done && styles.done]}>{step}</Text>
                </View>
              );
            })}
          </>
        ) : recent.length ? (
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
  offline: { marginTop: 18 },
  safe: { flex: 1, backgroundColor: colors.paper },
  scroll: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 120 },
  flex: { flex: 1, minWidth: 0 },
  head: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.duskTint,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: fonts.body, fontWeight: "600", fontSize: 14, color: colors.duskInk },
  sub: { ...type.body, color: colors.inkMuted, marginTop: 8 },
  subBone: { marginTop: 12, marginBottom: 4 },
  bones: { gap: 8 },
  last: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.sand,
    borderRadius: 24,
    padding: 16,
    marginTop: 18,
  },
  lastScore: { fontFamily: fonts.display, fontWeight: "800", fontSize: 28, letterSpacing: -0.8, color: colors.paper },
  lastBand: { ...type.heading },
  lastTip: { ...type.body, fontSize: 13, lineHeight: 18, color: colors.inkMuted, marginTop: 3 },
  start: { marginTop: 10 },
  sample: { height: 44, alignItems: "center", justifyContent: "center", marginTop: 4 },
  sampleText: { fontFamily: fonts.body, fontWeight: "600", fontSize: 14, color: colors.duskLink },
  pressed: { opacity: 0.85 },
  section: { marginTop: 24, marginBottom: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, height: 58 },
  mode: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  modeText: { fontFamily: fonts.body, fontWeight: "600", fontSize: 13, color: colors.ink },
  rowTitle: { fontFamily: fonts.body, fontWeight: "500", fontSize: 14.5, color: colors.ink },
  meta: { ...type.meta, marginTop: 2 },
  done: { color: colors.muted, textDecorationLine: "line-through" },
  rowScore: { fontFamily: fonts.mono, fontWeight: "500", fontSize: 15, color: colors.ink },
});
