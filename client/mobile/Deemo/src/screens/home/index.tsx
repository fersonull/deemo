import { PressableScale } from "@/components/pressable-scale";
import { router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { Avatar } from "@/components/avatar";
import { InboxButton } from "@/components/inbox-button";
import { Icon } from "@/components/icon";
import { Skeleton } from "@/components/skeleton";
import { StartButton } from "@/components/start-button";
import { tabBarSpace } from "@/components/tab-bar";
import { Score } from "@/components/score";
import { Offline } from "@/components/offline";
import { InterruptedSession } from "@/components/interrupted-session";
import { MODE_LABELS, type Mode } from "@/constants";
import { usePracticeSetup } from "@/hooks/use-practice-setup";
import { usePullRefresh } from "@/hooks/use-pull-refresh";
import { refreshEverything } from "@/hooks/refresh-everything";
import { projects, useProjects } from "@/hooks/use-projects";
import { session, useSession } from "@/hooks/use-session";
import { SessionsLeft } from "@/components/sessions-left";
import { sessions, useSessions } from "@/hooks/use-sessions";
import { colors, fonts, type } from "@/theme";
import { homeBrief } from "@/utils/home-brief";
import { riseIn } from "@/utils/motion";

import { TrendChart } from "../history/trend-chart";
import { DeemoBrief } from "./deemo-brief";
import { DefensePath } from "./defense-path";
import { GroupReadiness } from "./group-readiness";

const STEPS = [
  "Add your manuscript",
  "Practice one round",
  "See your readiness report",
];
// Each stage's mark on the recent rows: the idea (Title), the chapters and method (Pre-Oral), the finished study (Final).
const MODE_ICON: Record<Mode, string> = {
  TITLE: "lightbulb",
  PRE_ORAL: "assignment",
  FINAL: "school",
};
const MODE_BG: Record<Mode, string> = {
  TITLE: colors.sand,
  PRE_ORAL: colors.duskTint,
  FINAL: colors.sageTint,
};
const MODE_INK: Record<Mode, string> = {
  TITLE: colors.ink,
  PRE_ORAL: colors.duskInk,
  FINAL: colors.sageInk,
};

function greeting(hour: number) {
  if (hour < 12) return "Morning";
  if (hour < 18) return "Afternoon";
  return "Evening";
}

const day = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

// Home (plan S-05, prototype home): greeting, Deemo telling you where you stand (the last score on its sign, what it
// means and what to work on), Start practice, the readiness chart (two scored sessions or more) and recent sessions. Sections rise in a beat apart
// when they first appear.
export function Home() {
  const { name, email, avatar, premium } = useSession();
  const { bottom } = useSafeAreaInsets();
  const { list, loaded, error } = useSessions();
  const { projectId } = usePracticeSetup();
  const { projects: mine, loaded: projectsLoaded } = useProjects();
  const manuscript = mine.find((p) => p.id === projectId);
  // Until both lists arrive, assume a returning student: no "Add your manuscript" flash.
  const practiced =
    !!manuscript || list.length > 0 || !loaded || !projectsLoaded;
  const first = name?.trim().split(/\s+/)[0];
  const recent = list.slice(0, 3);
  const charted =
    loaded && !error && list.filter((s) => s.score !== undefined).length >= 2;
  const reduced = useReducedMotion();

  useFocusEffect(
    useCallback(() => {
      // The account (/me) is re-read here too, so the Free sessions-left count is current after a practice.
      void session.refresh();
      void sessions.refresh();
      void projects.refresh();
    }, []),
  );

  const open = (id: string) =>
    router.push({ pathname: "/results", params: { id } });
  const refresh = usePullRefresh(refreshEverything);

  // Offline: Deemo takes the whole screen; nothing else here would work.
  if (loaded && error) return <Offline onRetry={refreshEverything} />;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: tabBarSpace(bottom) },
        ]}
        refreshControl={refresh}
      >
        <View style={styles.head}>
          <Text accessibilityRole="header" style={[type.hero, styles.flex]}>
            {first
              ? `${greeting(new Date().getHours())},\n${first}.`
              : `${greeting(new Date().getHours())}.`}
          </Text>
          <InboxButton />
          <Pressable onPress={() => router.push("/profile")}>
            <Avatar
              seed={avatar}
              name={name}
              email={email}
              size={42}
              premium={premium}
            />
          </Pressable>
        </View>
        {/* Deemo, the informer: the last score on its sign, and what it means (or what to do first) */}
        {loaded && projectsLoaded ? (
          <Animated.View entering={riseIn(60, reduced)}>
            <DeemoBrief
              brief={homeBrief(list, manuscript?.name ?? null, !!error)}
            />
          </Animated.View>
        ) : (
          <Skeleton label="Loading">
            <View style={styles.briefBones}>
              <Skeleton.Bone width={76} height={66} radius={30} />
              <Skeleton.Bone width="70%" height={84} radius={18} />
            </View>
          </Skeleton>
        )}

        <View>
          <StartButton
            label={practiced ? "Start practice" : "Add your manuscript"}
            icon={practiced ? "mic" : "upload_file"}
            onPress={() => router.push(practiced ? "/practice" : "/projects")}
            style={styles.start}
          />
          <SessionsLeft style={styles.left} />
          {!practiced ? (
            <PressableScale
              accessibilityRole="button"
              onPress={() => router.push("/practice")}
              style={styles.sample}
            >
              <Text style={styles.sampleText}>
                Or practice with a sample paper
              </Text>
            </PressableScale>
          ) : null}

          <GroupReadiness />
          {loaded && !error && recent.length ? (
            <Animated.View entering={riseIn(100, reduced)}>
              <Text style={[type.label, styles.section]}>DEFENSE PATH</Text>
              <DefensePath sessions={list} />
            </Animated.View>
          ) : null}
          {charted ? (
            <Animated.View entering={riseIn(120, reduced)}>
              <Text style={[type.label, styles.section]}>YOUR READINESS</Text>
              <TrendChart sessions={list} stage={null} compact />
            </Animated.View>
          ) : null}
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
                  <View
                    key={step}
                    style={styles.row}
                    accessible
                    accessibilityLabel={`${step}${done ? ", done" : ""}`}
                  >
                    <Icon
                      name={done ? "check_circle" : "radio_button_unchecked"}
                      size={22}
                      color={done ? colors.sage : colors.muted}
                      filled={done}
                    />
                    <Text
                      style={[
                        styles.rowTitle,
                        styles.flex,
                        done && styles.done,
                      ]}
                    >
                      {step}
                    </Text>
                  </View>
                );
              })}
            </>
          ) : recent.length ? (
            <>
              <Text style={[type.label, styles.section]}>RECENT</Text>
              {recent.map((s, i) => (
                <Animated.View
                  key={s.id}
                  entering={riseIn(160 + i * 40, reduced)}
                >
                  <PressableScale
                    accessibilityRole="button"
                    accessibilityHint="Opens the report"
                    onPress={() => open(s.id)}
                    style={[styles.row]}
                  >
                    <View
                      style={[
                        styles.mode,
                        { backgroundColor: MODE_BG[s.mode] },
                      ]}
                    >
                      <Icon
                        name={MODE_ICON[s.mode]}
                        size={20}
                        color={MODE_INK[s.mode]}
                      />
                    </View>
                    <View style={styles.flex}>
                      <Text style={styles.rowTitle}>{MODE_LABELS[s.mode]}</Text>
                      <Text style={styles.meta} numberOfLines={1}>
                        {day(s.createdAt)} · {s.title}
                      </Text>
                    </View>
                    {s.score !== undefined ? (
                      <Score
                        value={s.score}
                        style={styles.rowScore}
                        caption
                        banded
                        align="right"
                      />
                    ) : (
                      <Text style={[styles.rowScore, styles.pending]}>
                        {s.status === "scoring" ? "…" : "–"}
                      </Text>
                    )}
                  </PressableScale>
                </Animated.View>
              ))}
            </>
          ) : null}
        </View>
      </ScrollView>
      <InterruptedSession />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  briefBones: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 16,
  },
  safe: { flex: 1, backgroundColor: colors.paper },
  scroll: { paddingHorizontal: 20, paddingTop: 14 },
  flex: { flex: 1, minWidth: 0 },
  head: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  bones: { gap: 8 },
  start: { marginTop: 8 },
  left: { marginTop: 8 },
  sample: {
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  sampleText: {
    fontFamily: fonts.body,
    fontWeight: "600",
    fontSize: 14,
    color: colors.duskLink,
  },
  section: { marginTop: 24, marginBottom: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, height: 58 },
  mode: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: {
    fontFamily: fonts.body,
    fontWeight: "500",
    fontSize: 14.5,
    color: colors.ink,
  },
  meta: { ...type.meta, marginTop: 2 },
  done: { color: colors.muted, textDecorationLine: "line-through" },
  rowScore: {
    fontFamily: fonts.display,
    fontWeight: "700",
    fontSize: 18,
    letterSpacing: -0.3,
    color: colors.ink,
  },
  pending: { color: colors.muted },
});
