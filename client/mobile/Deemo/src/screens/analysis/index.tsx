import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";

import { Blob } from "@/components/blob";
import { Button } from "@/components/button";
import { Fetching } from "@/components/fetching";
import { Icon } from "@/components/icon";
import { Screen } from "@/components/screen";
import { Sheet } from "@/components/sheet";
import { projects, useProjects, type Analysis as AnalysisData } from "@/hooks/use-projects";
import { colors, type } from "@/theme";
import { riseIn } from "@/utils/motion";

import { Reading } from "./reading";
import { SummaryCard } from "./summary-card";
import { GroupCard } from "./group-card";
import { FieldCard } from "./field-card";
import { useSession } from "@/hooks/use-session";

type TextField = Exclude<keyof AnalysisData, "facts" | "unsure" | "field">;

const CARDS: { k: TextField; title: string }[] = [
  { k: "title", title: "TITLE" },
  { k: "problem", title: "PROBLEM" },
  { k: "objectives", title: "OBJECTIVES" },
  { k: "method", title: "METHODOLOGY" },
  { k: "scope", title: "SCOPE" },
  { k: "features", title: "FEATURES / OUTPUT" }, // a study that builds nothing has none: the card is hidden
  { k: "limits", title: "LIMITATIONS" },
  { k: "results", title: "RESULTS" },
];

const POLL_MS = 2500;

// Document Logic Analysis (plan F2, screens S-07): reading → "Here's what we understood" → confirm.
export function Analysis({ id }: { id: string }) {
  const project = useProjects().projects.find((p) => p.id === id);
  const { course } = useSession();
  // A failed upload holds nothing worth keeping (the file is never stored): it's deleted as soon as its reason is shown,
  // and the reason stays on screen (issue #10). The server also sweeps failed uploads the student never opened.
  const [failedReason, setFailedReason] = useState<string | null>(null);
  if (project?.status === "failed" && failedReason === null) setFailedReason(project.error ?? "Try a text-based PDF or a DOCX.");
  useEffect(() => {
    if (project?.status === "failed" && !project.group) projects.remove(id).catch(() => {}); // a failed delete: the sweep gets it
  }, [project?.status, project?.group, id]);
  const [offline, setOffline] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const reduced = useReducedMotion();
  // Summary cards enter one after another: 40 ms apart, the first six only, so a long list never drags.
  const stagger = (i: number) => riseIn(Math.min(i, 5) * 40, reduced);

  // Poll until the server finishes reading (or fails).
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const p = await projects.get(id);
        if (!alive) return;
        setOffline(false);
        if (p.status === "analyzing") timer = setTimeout(tick, POLL_MS);
      } catch {
        if (!alive) return;
        setOffline(true);
        timer = setTimeout(tick, POLL_MS * 2);
      }
    };
    void tick();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [id]);

  const back = () => router.back();

  const remove = async () => {
    setBusy(true);
    setError("");
    try {
      await projects.remove(id);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't delete. Try again.");
      setConfirmDelete(false);
      setBusy(false);
    }
  };

  if (failedReason !== null) {
    return (
      <Screen onBack={back}>
        <View style={styles.failed}>
          <Blob width={96} height={84} color={colors.sand}>
            <Icon name="description" size={34} color={colors.inkMuted} />
          </Blob>
          <Text accessibilityRole="header" style={[type.title, styles.failedTitle]}>
            {"This file won't\nwork."}
          </Text>
          <Text style={styles.sub}>{failedReason}</Text>
          <Text style={[styles.sub, styles.removedNote]}>{"It wasn't saved. Upload another file from Projects."}</Text>
        </View>
        <Button label="Back to projects" onPress={back} />
      </Screen>
    );
  }

  if (!project || project.status === "analyzing") {
    return (
      <Screen onBack={back}>
        {project ? (
          <Reading since={project.createdAt} />
        ) : (
          <Fetching title={"Opening your\nmanuscript."} subtitle="Getting the summary the panel works from." />
        )}
        {offline ? <Text style={styles.offline}>{"Can't reach the DEEMO server. Retrying…"}</Text> : null}
      </Screen>
    );
  }

  if (!project.analysis) {
    return (
      <Screen onBack={back}>
        <Fetching title={"Opening your\nmanuscript."} subtitle="Getting the summary the panel works from." />
      </Screen>
    );
  }

  const a = project.analysis;
  const readOnly = !!project.group && !project.group.isOwner;
  const cards = CARDS.filter((c) => (c.k !== "results" && c.k !== "features") || a[c.k].trim());
  const save = (edits: Partial<AnalysisData>) => projects.saveAnalysis(id, edits).then(() => {});

  const go = async () => {
    setBusy(true);
    setError("");
    try {
      const p = project.confirmedAt ? project : await projects.saveAnalysis(id, {}, true);
      projects.use(p);
      router.replace("/practice");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save. Try again.");
      setBusy(false);
    }
  };

  return (
    <Screen scroll onBack={back} title={"Here's what\nwe understood."}>
      <Text style={styles.sub}>
        {readOnly
          ? "Your group's shared summary. Ask your leader to correct anything that's off."
          : "The panel asks questions from this. Fix anything that's off."}
      </Text>
      {project.confirmedAt ? <GroupCard project={project} onLeft={back} /> : null}
      <View style={styles.cards}>
        <Animated.View entering={stagger(0)}>
          <FieldCard project={project} readOnly={readOnly} course={course} />
        </Animated.View>
        {cards.map((c, i) => (
          <Animated.View key={c.k} entering={stagger(i)}>
            <SummaryCard
              readOnly={readOnly}
              title={c.title}
              body={a[c.k]}
              unsure={a.unsure.includes(c.k)}
              onSave={(text) => save({ [c.k]: text.trim() })}
            />
          </Animated.View>
        ))}
        <Animated.View entering={stagger(cards.length)}>
          <SummaryCard
            title="KEY FACTS"
            readOnly={readOnly}
            list
            body={a.facts.join("\n")}
            onSave={(text) =>
              save({
                facts: text
                  .split("\n")
                  .map((l) => l.replace(/^[•\-\s]+/, "").trim())
                  .filter(Boolean),
              })
            }
          />
        </Animated.View>
      </View>
      <Text style={styles.factsNote}>Key facts are what the panel checks your answers against.</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.cta}>
        <Button label={busy ? "Saving…" : project.confirmedAt ? "Practice with this" : "Looks right"} onPress={go} busy={busy} disabled={busy} />
      </View>
      {!readOnly ? (
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => setConfirmDelete(true)} style={styles.textButton}>
          <Text style={styles.textButtonLabel}>Delete project</Text>
        </Pressable>
      ) : null}

      <Sheet visible={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <Text style={styles.sheetTitle}>Delete this project?</Text>
        <Text style={styles.sub}>
          {project.group
            ? "The summary and corrections are removed for good. Your group is dissolved and teammates lose manuscript access. Past sessions stay in each member's private history."
            : "The summary and your corrections are removed for good. You can upload the manuscript again anytime."}
        </Text>
        <View style={styles.cta}>
          <Button label={busy ? "Deleting…" : "Delete project"} onPress={remove} busy={busy} disabled={busy} />
        </View>
        <Pressable accessibilityRole="button" onPress={() => setConfirmDelete(false)} style={styles.textButton}>
          <Text style={styles.textButtonLabel}>Keep it</Text>
        </Pressable>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sub: { ...type.body, fontSize: 13.5, lineHeight: 20, color: colors.inkMuted, marginTop: 8 },
  cards: { gap: 8, marginTop: 16 },
  factsNote: { ...type.meta, lineHeight: 17, marginTop: 8, paddingHorizontal: 4 },
  error: { ...type.body, fontSize: 13, color: colors.clay, marginTop: 10 },
  cta: { marginTop: 16 },
  textButton: { height: 48, alignItems: "center", justifyContent: "center", marginTop: 4 },
  textButtonLabel: { ...type.button, fontSize: 14, color: colors.ink },
  sheetTitle: { ...type.title, fontSize: 26, lineHeight: 28, letterSpacing: -0.8 },
  offline: { ...type.meta, textAlign: "center", marginBottom: 8 },
  failed: { flex: 1, justifyContent: "center" },
  failedTitle: { marginTop: 22 },
  removedNote: { marginTop: 8 },
});
