import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/icon";
import { Screen } from "@/components/screen";
import { usePracticeSetup } from "@/hooks/use-practice-setup";
import { projects, useProjects, type Project } from "@/hooks/use-projects";
import { colors, fonts, radius, type } from "@/theme";

import { UploadSheet } from "./upload-sheet";

const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

function describe(p: Project, active: boolean): { icon: string; meta: string } {
  if (p.status === "analyzing") return { icon: "hourglass_top", meta: `Reading… · ${p.domain}` };
  if (p.status === "failed") return { icon: "error", meta: p.error ?? "Couldn't read this file." };
  if (!p.confirmedAt) return { icon: "rate_review", meta: `Check the summary · ${p.domain}` };
  return { icon: "description", meta: `${active ? "Active · " : ""}${p.domain} · analyzed ${day(p.createdAt)}` };
}

// Projects (plan S-05/S-06): one manuscript per project. Group join codes come later (addendum Q10).
export function Projects() {
  const { projects: list, loaded, error } = useProjects();
  const { projectId } = usePracticeSetup();
  const [adding, setAdding] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void projects.refresh();
    }, []),
  );

  const open = (p: Project) => router.push({ pathname: "/analysis", params: { id: p.id } });

  return (
    <Screen scroll tabBar title="Projects" subtitle="One manuscript per project.">
      <View style={styles.list}>
        {list.map((p) => {
          const active = p.id === projectId;
          const { icon, meta } = describe(p, active);
          return (
            <Pressable
              key={p.id}
              accessibilityRole="button"
              accessibilityHint="Opens the manuscript summary"
              onPress={() => open(p)}
              style={({ pressed }) => [styles.card, active && styles.active, pressed && styles.pressed]}
            >
              <View style={styles.tile}>
                <Icon name={icon} size={21} color={p.status === "failed" ? colors.clay : colors.duskIcon} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {p.analysis?.title || p.name}
                </Text>
                <Text style={styles.meta}>{meta}</Text>
              </View>
            </Pressable>
          );
        })}
        {loaded && error ? (
          <Text style={styles.note}>{"Can't reach the DEEMO server right now. Your projects will show up when it's back."}</Text>
        ) : loaded && list.length === 0 ? (
          <Text style={styles.note}>No manuscripts yet. Until you add one, practice uses a sample paper.</Text>
        ) : null}
      </View>

      <Pressable accessibilityRole="button" onPress={() => setAdding(true)} style={({ pressed }) => [styles.add, pressed && styles.pressed]}>
        <Icon name="upload_file" size={21} color={colors.duskLink} />
        <Text style={styles.addText}>Upload a manuscript</Text>
      </Pressable>

      <UploadSheet
        visible={adding}
        onClose={() => setAdding(false)}
        onUploaded={(p) => {
          setAdding(false);
          open(p);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  list: { gap: 8, marginTop: 18 },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    borderRadius: radius.xl,
    backgroundColor: colors.sand,
    borderWidth: 2,
    borderColor: "transparent",
  },
  active: { borderColor: colors.dusk },
  pressed: { opacity: 0.85 },
  tile: { width: 42, height: 42, borderRadius: radius.md, backgroundColor: colors.paper, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontFamily: fonts.body, fontWeight: "600", fontSize: 14.5, lineHeight: 19.5, color: colors.ink },
  meta: { ...type.meta, lineHeight: 17, marginTop: 3 },
  note: { ...type.body, fontSize: 13, color: colors.inkMuted, paddingHorizontal: 4 },
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
