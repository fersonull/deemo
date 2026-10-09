import { router } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Blob } from "@/components/blob";
import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import { Screen } from "@/components/screen";
import { projects, useProjects, type Analysis as AnalysisData } from "@/hooks/use-projects";
import { colors, type } from "@/theme";

import { Reading } from "./reading";
import { SummaryCard } from "./summary-card";

type TextField = Exclude<keyof AnalysisData, "facts" | "unsure">;

const CARDS: { k: TextField; title: string }[] = [
  { k: "title", title: "TITLE" },
  { k: "problem", title: "PROBLEM" },
  { k: "objectives", title: "OBJECTIVES" },
  { k: "method", title: "METHODOLOGY" },
  { k: "scope", title: "SCOPE" },
  { k: "features", title: "KEY FEATURES" },
  { k: "limits", title: "LIMITATIONS" },
  { k: "results", title: "RESULTS" },
];

const POLL_MS = 2500;

// Document Logic Analysis (plan F2, screens S-07): reading → "Here's what we understood" → confirm.
export function Analysis({ id }: { id: string }) {
  const project = useProjects().projects.find((p) => p.id === id);
  const [offline, setOffline] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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

  if (!project || project.status === "analyzing") {
    return (
      <Screen onBack={back}>
        {project ? <Reading since={project.createdAt} /> : null}
        {offline ? <Text style={styles.offline}>{"Can't reach the DEEMO server. Retrying…"}</Text> : null}
      </Screen>
    );
  }

  if (project.status === "failed" || !project.analysis) {
    return (
      <Screen onBack={back}>
        <View style={styles.failed}>
          <Blob width={96} height={84} color={colors.sand}>
            <Icon name="description" size={34} color={colors.inkMuted} />
          </Blob>
          <Text accessibilityRole="header" style={[type.title, styles.failedTitle]}>
            {"We couldn't\nread this file."}
          </Text>
          <Text style={styles.sub}>{project.error ?? "Try a text-based PDF or a DOCX."}</Text>
        </View>
        <Button label="Back to projects" onPress={back} />
      </Screen>
    );
  }

  const a = project.analysis;
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
      <Text style={styles.sub}>{"The panel asks questions from this. Fix anything that's off."}</Text>
      <View style={styles.cards}>
        {CARDS.filter((c) => c.k !== "results" || a.results.trim()).map((c) => (
          <SummaryCard
            key={c.k}
            title={c.title}
            body={a[c.k]}
            unsure={a.unsure.includes(c.k)}
            onSave={(text) => save({ [c.k]: text.trim() })}
          />
        ))}
        <SummaryCard
          title="KEY FACTS"
          list
          body={a.facts.join("\n")}
          onSave={(text) => save({ facts: text.split("\n").map((l) => l.replace(/^[•\-\s]+/, "").trim()).filter(Boolean) })}
        />
      </View>
      <Text style={styles.factsNote}>Key facts are what the panel checks your answers against.</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.cta}>
        <Button label={project.confirmedAt ? "Practice with this" : "Looks right"} onPress={go} disabled={busy} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sub: { ...type.body, fontSize: 13.5, lineHeight: 20, color: colors.inkMuted, marginTop: 8 },
  cards: { gap: 8, marginTop: 16 },
  factsNote: { ...type.meta, lineHeight: 17, marginTop: 8, paddingHorizontal: 4 },
  error: { ...type.body, fontSize: 13, color: colors.clay, marginTop: 10 },
  cta: { marginTop: 16 },
  offline: { ...type.meta, textAlign: "center", marginBottom: 8 },
  failed: { flex: 1, justifyContent: "center" },
  failedTitle: { marginTop: 22 },
});
