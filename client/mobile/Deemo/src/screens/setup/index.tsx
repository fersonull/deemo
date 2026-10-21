import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import { Screen } from "@/components/screen";
import { Skeleton } from "@/components/skeleton";
import { UpsellSheet } from "@/components/upsell-sheet";
import { DEFAULT_WEIGHTS, DIFFICULTY_LABELS, MODE_LABELS, isComputing, profileCourse, type Mode } from "@/constants";
import { practiceSetup, usePracticeSetup } from "@/hooks/use-practice-setup";
import { projects, useProjects } from "@/hooks/use-projects";
import { session, useSession } from "@/hooks/use-session";
import { colors, lit, radius, type } from "@/theme";
import { PressableScale } from "@/components/pressable-scale";

import { Segmented } from "./segmented";
import { DomainSheet } from "./sheets";
import { FocusArea } from "./focus-area";
import { PanelPreview } from "./panel-preview";

const MODES: { value: Mode; desc: string }[] = [
  { value: "TITLE", desc: "Problem, objectives, feasibility" },
  { value: "PRE_ORAL", desc: "Methodology, design, progress" },
  { value: "FINAL", desc: "Results, testing, conclusions" },
];

// Free tier (addendum Q1): Title + Pre-Oral, 1 panelist. Locked choices open the upsell. There's no length to pick: the
// panel covers its agenda and ends (the plan's safety cap stops a runaway session).
export function Setup() {
  const setup = usePracticeSetup();
  const { premium, course, accountLoaded } = useSession();
  const [sheet, setSheet] = useState<"domain" | "upsell" | null>(null);
  const upsell = () => setSheet("upsell");
  const list = useProjects();
  const manuscript = list.projects.find((p) => p.id === setup.projectId);
  const field = profileCourse(manuscript, course); // the manuscript's field, else the student's course

  useFocusEffect(
    useCallback(() => {
      void projects.refresh();
      practiceSetup.set({ weakFrom: null }); // setting up by hand is a normal round
    }, []),
  );

  // A saved setup can hold Premium choices from before a downgrade: fall back to the Free ones, once the account's
  // plan is known (so a Premium student isn't clamped while it loads).
  useEffect(() => {
    if (!accountLoaded || premium) return;
    const { mode, panelists } = practiceSetup.get();
    if (mode === "FINAL" || panelists > 1) practiceSetup.set({ mode: mode === "FINAL" ? "PRE_ORAL" : mode, panelists: 1 });
  }, [accountLoaded, premium]);

  return (
    <>
      <Screen scroll onBack={() => router.back()} title={"Which defense\ntoday?"}>
        <View accessibilityRole="radiogroup" accessibilityLabel="Defense stage" style={styles.modes}>
          {MODES.map((m) => {
            const locked = m.value === "FINAL" && !premium;
            const selected = setup.mode === m.value;
            const fg = selected ? colors.paper : colors.ink;
            return (
              <PressableScale
                key={m.value}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                accessibilityHint={locked ? "Premium" : undefined}
                onPress={() => (locked ? upsell() : practiceSetup.set({ mode: m.value }))}
                style={[styles.mode, selected && styles.inkCard]}
              >
                <View style={styles.flex}>
                  <Text style={[type.heading, { color: fg }]}>{MODE_LABELS[m.value]}</Text>
                  <Text style={[styles.desc, { color: fg }]}>{m.desc}</Text>
                </View>
                <Icon name={locked ? "lock" : selected ? "radio_button_checked" : "radio_button_unchecked"} color={fg} />
              </PressableScale>
            );
          })}
        </View>
        {/* The panel only sees the stage's chapters (server panel.ts manuscriptFacts); Final needs results to ask about. */}
        {setup.mode === "FINAL" && manuscript?.analysis && !manuscript.analysis.results.trim() ? (
          <View style={styles.stageNote}>
            <Icon name="info" size={18} color={colors.amberInk} />
            <Text style={styles.stageNoteText}>
              This manuscript has no results chapter yet, so a Final Defense has little to ask about. Pre-Oral fits it better.
            </Text>
          </View>
        ) : null}

        <Text style={[type.label, styles.section]}>PRACTICING WITH</Text>
        <PressableScale
          accessibilityRole="button"
          accessibilityHint={manuscript ? "Choose another manuscript" : "Upload your manuscript"}
          onPress={() => router.push("/projects")}
          style={styles.manuscript}
        >
          <Icon name="description" size={20} color={colors.duskIcon} />
          <View style={styles.flex}>
            <Text style={type.label}>MANUSCRIPT</Text>
            {manuscript || list.loaded ? (
              <Text style={styles.manuscriptName} numberOfLines={1}>
                {manuscript ? manuscript.analysis?.title || manuscript.name : "Sample paper (ReqTrack)"}
              </Text>
            ) : (
              <Skeleton label="Loading your manuscript">
                <Skeleton.Bone width="70%" height={14} style={styles.nameBone} />
              </Skeleton>
            )}
          </View>
          <View style={styles.change}>
            <Text style={styles.changeText}>{manuscript ? "Change" : "Upload"}</Text>
          </View>
        </PressableScale>
        <PressableScale
          accessibilityRole="button"
          accessibilityHint="Change the rubric weights"
          onPress={() => router.push("/rubric")}
          style={[styles.manuscript, styles.rubricRow]}
        >
          <Icon name="balance" size={20} color={colors.duskIcon} />
          <View style={styles.flex}>
            <Text style={type.label}>SCORING</Text>
            <Text style={styles.manuscriptName} numberOfLines={1}>
              {manuscript?.group
                ? manuscript.rubric
                  ? "Your group's panel rubric"
                  : "Shared group rubric"
                : manuscript?.rubric
                  ? "Your panel's rubric"
                  : setup.weights.every((w, i) => w === DEFAULT_WEIGHTS[i])
                  ? "Default rubric"
                  : "Your rubric weights"}
            </Text>
          </View>
          <View style={styles.change}>
            <Text style={styles.changeText}>{manuscript?.group && !manuscript.group.isOwner ? "View" : "Change"}</Text>
          </View>
        </PressableScale>
        {/* The IT field is for computing courses only; every other course is profiled by the course (plan F4). */}
        {isComputing(field) ? (
          <PressableScale
            accessibilityRole="button"
            accessibilityHint="Change IT field"
            onPress={() => setSheet("domain")}
            style={[styles.manuscript, styles.rubricRow]}
          >
            <Icon name="category" size={20} color={colors.duskIcon} />
            <View style={styles.flex}>
              <Text style={type.label}>IT FIELD</Text>
              <Text style={styles.manuscriptName} numberOfLines={1}>
                {setup.domain}
              </Text>
            </View>
            <View style={styles.change}>
              <Text style={styles.changeText}>Change</Text>
            </View>
          </PressableScale>
        ) : null}

        <Text style={[type.label, styles.section]}>PANELISTS</Text>
        <Segmented
          label="Panelists"
          value={setup.panelists}
          onChange={(panelists) => practiceSetup.set({ panelists })}
          onLocked={upsell}
          options={[1, 2, 3].map((n) => ({ value: n, label: String(n), locked: n > 1 && !premium }))}
        />
        <PanelPreview course={field} panelists={setup.panelists} />

        <Text style={[type.label, styles.section]}>FOLLOW-UPS PER TOPIC</Text>
        <Segmented
          label="Follow-ups per topic"
          value={setup.followUps}
          onChange={(followUps) => practiceSetup.set({ followUps })}
          onLocked={upsell}
          options={[0, 1, 2, 3].map((n) => ({ value: n, label: n === 0 ? "None" : String(n) }))}
        />

        <Text style={[type.label, styles.section]}>DIFFICULTY</Text>
        <Segmented
          label="Difficulty"
          value={setup.difficulty}
          onChange={(difficulty) => practiceSetup.set({ difficulty })}
          onLocked={upsell}
          options={(["EASY", "STANDARD", "HARD"] as const).map((d) => ({ value: d, label: DIFFICULTY_LABELS[d] }))}
        />

        {manuscript?.group ? <FocusArea key={manuscript.id} project={manuscript} /> : null}
        <View style={styles.cta}>
          <Button
            label="Continue to mic check"
            onPress={() => {
              if (!isComputing(field)) practiceSetup.set({ domain: "General" }); // no IT field outside computing courses
              router.push("/mic-check");
            }}
          />
        </View>

        <DomainSheet
          visible={sheet === "domain"}
          value={setup.domain}
          onClose={() => setSheet(null)}
          onPick={(domain) => {
            practiceSetup.set({ domain });
            setSheet(null);
          }}
        />
        <UpsellSheet
          visible={sheet === "upsell"}
          onClose={() => setSheet(null)}
          onUpgrade={() => {
            session.upgrade();
            setSheet(null);
          }}
        />
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  manuscript: {
    ...lit,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingLeft: 14,
    paddingRight: 8,
    borderRadius: radius.lg,
    backgroundColor: colors.sand,
  },
  manuscriptName: { ...type.bodyStrong, marginTop: 2 },
  nameBone: { marginTop: 6, marginBottom: 2 },
  rubricRow: { marginTop: 8 },
  change: { minHeight: 26, paddingVertical: 3, borderRadius: 13, backgroundColor: colors.paper, paddingHorizontal: 10, justifyContent: "center" },
  changeText: { ...type.meta, fontWeight: "600", color: colors.ink },
  modes: { gap: 8, marginTop: 18 },
  stageNote: { flexDirection: "row", gap: 10, alignItems: "flex-start", marginTop: 10, padding: 12, borderRadius: radius.lg, backgroundColor: colors.amberTint },
  stageNoteText: { ...type.body, flex: 1, fontSize: 13, lineHeight: 18, color: colors.amberInk },
  mode: {
    ...lit,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radius.xl,
    backgroundColor: colors.sand,
  },
  inkCard: { backgroundColor: colors.ink },
  desc: { ...type.body, fontSize: 12.5, lineHeight: 17.5, opacity: 0.75, marginTop: 2 },
  section: { marginTop: 20, marginBottom: 8 },
  cta: { marginTop: 20 },
});
