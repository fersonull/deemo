import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/button";
import { Screen } from "@/components/screen";
import { DEFAULT_WEIGHTS, RUBRIC } from "@/constants";
import { practiceSetup, usePracticeSetup } from "@/hooks/use-practice-setup";
import { projects, useProjects, type Rubric as PanelRubric } from "@/hooks/use-projects";
import { colors, fonts, radius, type } from "@/theme";

import { UploadCard } from "./upload-card";

const STEP = 5;
const MAX = 60; // default criteria (server validWeights)

// "How you'll be scored." (prototype rubric screen, plan F3): the default five criteria with adjustable weights, or
// the panel's own rubric read from their form (upload-card.tsx), which replaces the default entirely.
export function Rubric() {
  const { weights: saved, projectId } = usePracticeSetup();
  const project = useProjects().projects.find((p) => p.id === projectId);
  const readOnly = !!project?.group && !project.group.isOwner;
  const [weights, setWeights] = useState(saved);
  const [custom, setCustom] = useState<PanelRubric | null>(project?.rubric ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const rows = custom
    ? custom.criteria
    : RUBRIC.map((c, i) => ({ name: c.name, desc: c.desc, weight: weights[i] ?? 0, scored: true }));
  const total = rows.reduce((a, r) => a + (r.scored ? r.weight : 0), 0);
  const max = custom ? 100 : MAX;
  const isDefault = !custom && weights.every((w, i) => w === DEFAULT_WEIGHTS[i]);

  const nudge = (i: number, by: number) => {
    const next = (w: number) => Math.min(max, Math.max(0, w + by));
    if (custom) setCustom({ ...custom, criteria: custom.criteria.map((c, k) => (k === i ? { ...c, weight: next(c.weight) } : c)) });
    else setWeights((ws) => ws.map((w, k) => (k === i ? next(w) : w)));
  };

  const use = async () => {
    setBusy(true);
    setError("");
    try {
      if (projectId) await projects.saveRubric(projectId, custom ? { rubric: custom } : { weights });
      if (!custom) practiceSetup.set({ weights });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save the rubric.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll onBack={() => router.back()} title={"How you'll\nbe scored."}>
      <Text style={styles.sub}>
        {custom
          ? `Your panel's own rubric${custom.source ? `, from ${custom.source}` : ""}. Adjust the weights if your form changed.`
          : "Five criteria, like most capstone defense forms. Set the weights to match your panel."}
      </Text>
      {project?.group ? (
        <Text style={styles.sub}>
          {readOnly ? "Your leader manages this shared rubric." : "Changes apply to every member's next practice."}
        </Text>
      ) : null}
      {readOnly || busy ? null : projectId ? (
        <UploadCard onRubric={setCustom} />
      ) : (
        <Text style={styles.sub}>Add your manuscript to use your panel&apos;s own rubric.</Text>
      )}

      <View style={styles.list}>
        {rows.map((c, i) => (
          <View key={`${i}-${c.name}`} style={styles.row}>
            <View style={styles.flex}>
              <Text style={styles.name}>{c.name}</Text>
              <Text style={styles.desc}>{c.desc}</Text>
            </View>
            {c.scored ? (
              <>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Lower ${c.name}`}
                  disabled={readOnly || busy || c.weight <= 0}
                  onPress={() => nudge(i, -STEP)}
                  hitSlop={6}
                  style={[styles.step, c.weight <= 0 && styles.dim]}
                >
                  <Text style={styles.stepText}>−</Text>
                </Pressable>
                <Text style={styles.weight} accessibilityLabel={`${c.name} ${c.weight} percent`}>
                  {c.weight}%
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Raise ${c.name}`}
                  disabled={readOnly || busy || c.weight >= max}
                  onPress={() => nudge(i, STEP)}
                  hitSlop={6}
                  style={[styles.step, c.weight >= max && styles.dim]}
                >
                  <Text style={styles.stepText}>+</Text>
                </Pressable>
              </>
            ) : (
              <Text style={styles.unscored} accessibilityLabel={`${c.name}: not scored in practice`}>
                {"Not scored\nin practice"}
              </Text>
            )}
          </View>
        ))}
      </View>

      <Text style={[styles.total, { color: total === 100 ? colors.sageInk : colors.warnInk }]} accessibilityLiveRegion="polite">
        {total === 100 ? "Total 100%" : `Total ${total}%. Make it 100% to use it.`}
      </Text>
      {custom?.criteria.some((c) => !c.scored) ? (
        <Text style={styles.note}>
          DEEMO judges the oral defense, so criteria about the written paper or a live demo don&apos;t count toward your practice
          score.
        </Text>
      ) : null}

      <View style={styles.cta}>
        {error ? (
          <Text accessibilityLiveRegion="polite" style={styles.sub}>
            {error}
          </Text>
        ) : null}
        <Button
          label={readOnly ? "Back to setup" : busy ? "Saving…" : "Use this rubric"}
          onPress={readOnly ? () => router.back() : use}
          disabled={busy || (!readOnly && total !== 100)}
        />
      </View>
      {readOnly || busy ? null : custom ? (
        <Pressable accessibilityRole="button" onPress={() => setCustom(null)} style={styles.reset}>
          <Text style={styles.resetText}>Back to the default rubric</Text>
        </Pressable>
      ) : !isDefault ? (
        <Pressable accessibilityRole="button" onPress={() => setWeights(DEFAULT_WEIGHTS)} style={styles.reset}>
          <Text style={styles.resetText}>Back to the default weights</Text>
        </Pressable>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  sub: { ...type.body, fontSize: 13.5, lineHeight: 20, color: colors.inkMuted, marginTop: 8 },
  list: { gap: 8, marginTop: 18 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.sand,
    borderRadius: radius.lg,
    paddingVertical: 12,
    paddingLeft: 16,
    paddingRight: 10,
  },
  name: { fontFamily: fonts.body, fontWeight: "600", fontSize: 14.5, color: colors.ink },
  desc: { ...type.meta, lineHeight: 17, marginTop: 2 },
  step: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.paper,
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: { fontFamily: fonts.body, fontWeight: "600", fontSize: 18, color: colors.ink },
  dim: { opacity: 0.35 },
  weight: { width: 48, textAlign: "center", fontFamily: fonts.mono, fontWeight: "500", fontSize: 15, color: colors.ink },
  unscored: { ...type.meta, fontSize: 11.5, lineHeight: 15, textAlign: "right", paddingRight: 6 },
  total: { fontFamily: fonts.body, fontWeight: "600", fontSize: 13, marginTop: 12, paddingHorizontal: 4 },
  note: { ...type.meta, lineHeight: 17, marginTop: 6, paddingHorizontal: 4 },
  cta: { marginTop: 16 },
  reset: { height: 48, alignItems: "center", justifyContent: "center", marginTop: 4 },
  resetText: { ...type.button, fontSize: 14, color: colors.ink },
});
