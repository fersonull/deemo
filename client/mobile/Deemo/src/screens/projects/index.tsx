import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/icon";
import { Screen } from "@/components/screen";
import { Skeleton } from "@/components/skeleton";
import { UpsellSheet } from "@/components/upsell-sheet";
import { usePracticeSetup } from "@/hooks/use-practice-setup";
import { FREE_PROJECTS, countsTowardLimit, projects, useProjects, type Project } from "@/hooks/use-projects";
import { session, useSession } from "@/hooks/use-session";
import { colors, fonts, radius, type } from "@/theme";

import { UploadSheet } from "./upload-sheet";
import { JoinSheet } from "./join-sheet";

const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

function describe(p: Project): { icon: string; meta: string } {
  if (p.status === "analyzing") return { icon: "hourglass_top", meta: `Reading… · ${p.domain}` };
  if (p.status === "failed") return { icon: "error", meta: p.error ?? "Couldn't read this file." };
  if (!p.confirmedAt) return { icon: "rate_review", meta: `Check the summary · ${p.domain}` };
  return { icon: "description", meta: `${p.domain} · analyzed ${day(p.createdAt)}` };
}

// Owned and joined manuscripts share the same project list (addendum Q10).
export function Projects() {
  const { projects: list, loaded, error } = useProjects();
  const { projectId } = usePracticeSetup();
  const { premium } = useSession();
  const [sheet, setSheet] = useState<"upload" | "upsell" | "join" | null>(null);
  // Free tier holds one manuscript; delete it to upload another (addendum Q1).
  const locked = !premium && list.filter(countsTowardLimit).length >= FREE_PROJECTS;

  useFocusEffect(
    useCallback(() => {
      void projects.refresh();
    }, []),
  );

  const open = (p: Project) => router.push({ pathname: "/analysis", params: { id: p.id } });

  return (
    <Screen scroll tabBar title="Projects" subtitle="One manuscript per project." onRefresh={projects.refresh}>
      <View style={styles.list}>
        {list.map((p) => {
          const active = p.id === projectId;
          const { icon, meta } = describe(p);
          return (
            <Pressable
              key={p.id}
              accessibilityRole="button"
              accessibilityHint="Opens the manuscript summary"
              onPress={() => open(p)}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            >
              <View style={[styles.tile, p.group && styles.shared]}>
                <Icon name={p.group ? "group" : icon} size={21} color={p.status === "failed" ? colors.clay : colors.duskIcon} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {p.analysis?.title || p.name}
                </Text>
                <View style={styles.metaRow}>
                  {active ? (
                    <View style={styles.chip} accessibilityLabel="Used for practice">
                      <Icon name="mic" size={13} color={colors.duskInk} filled />
                      <Text style={styles.chipText}>Practicing</Text>
                    </View>
                  ) : null}
                  <Text style={[styles.meta, styles.flex]}>{p.group ? `Shared · ${p.domain}` : meta}</Text>
                </View>
              </View>
            </Pressable>
          );
        })}
        {!loaded ? (
          <Skeleton label="Loading your projects">
            <View style={styles.list}>
              {[0, 1].map((i) => (
                <View key={i} style={styles.card}>
                  <Skeleton.Bone width={42} height={42} radius={12} />
                  <View style={[styles.flex, styles.bones]}>
                    <Skeleton.Bone width="80%" height={14} />
                    <Skeleton.Bone width="50%" height={11} />
                  </View>
                </View>
              ))}
            </View>
          </Skeleton>
        ) : error ? (
          <Text style={styles.note}>{"Can't reach the DEEMO server right now. Your projects will show up when it's back."}</Text>
        ) : loaded && list.length === 0 ? (
          <Text style={styles.note}>No manuscripts yet. Until you add one, practice uses a sample paper.</Text>
        ) : null}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityHint={locked ? "Premium: the free plan holds one manuscript" : undefined}
        onPress={() => setSheet(locked ? "upsell" : "upload")}
        style={({ pressed }) => [styles.add, pressed && styles.pressed]}
      >
        <Icon name={locked ? "lock" : "upload_file"} size={21} color={colors.duskLink} />
        <Text style={styles.addText}>{locked ? "Upload another manuscript" : "Upload a manuscript"}</Text>
      </Pressable>
      {locked ? <Text style={styles.note}>The free plan holds one manuscript. Delete it or try Premium to add more.</Text> : null}
      <Pressable accessibilityRole="button" onPress={() => setSheet("join")} style={[styles.card, styles.join]}>
        <Icon name="group_add" size={22} color={colors.duskIcon} />
        <View style={styles.flex}>
          <Text style={styles.cardTitle}>Join with a code</Text>
          <Text style={styles.meta}>6 characters, from your group leader</Text>
        </View>
        <Icon name="chevron_right" size={20} color={colors.muted} />
      </Pressable>
      <JoinSheet
        visible={sheet === "join"}
        onClose={() => setSheet(null)}
        onJoined={(p) => {
          setSheet(null);
          open(p);
        }}
      />

      <UploadSheet
        visible={sheet === "upload"}
        onClose={() => setSheet(null)}
        onUploaded={(p) => {
          setSheet(null);
          open(p);
        }}
      />
      <UpsellSheet
        visible={sheet === "upsell"}
        onClose={() => setSheet(null)}
        onUpgrade={() => {
          session.upgrade();
          setSheet("upload");
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  shared: { borderWidth: 2, borderColor: colors.dusk },
  join: { marginTop: 10, backgroundColor: colors.paper, borderWidth: 1.5, borderColor: colors.sand, alignItems: "center" },
  list: { gap: 8, marginTop: 18 },
  bones: { gap: 8, paddingTop: 2 },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    borderRadius: radius.xl,
    backgroundColor: colors.sand,
  },
  pressed: { opacity: 0.85 },
  tile: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.paper,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontFamily: fonts.body, fontWeight: "600", fontSize: 14.5, lineHeight: 19.5, color: colors.ink },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  meta: { ...type.meta, lineHeight: 17 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 8,
    backgroundColor: colors.duskTint,
  },
  chipText: { fontFamily: fonts.body, fontWeight: "600", fontSize: 11.5, color: colors.duskInk },
  note: { ...type.body, fontSize: 13, color: colors.inkMuted, paddingHorizontal: 4, marginTop: 8 },
  add: {
    height: 58,
    marginTop: 12,
    borderRadius: radius.xl,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "rgba(42,36,32,0.18)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  addText: { fontFamily: fonts.body, fontWeight: "600", fontSize: 15, color: colors.duskLink },
});
