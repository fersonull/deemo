import { PressableScale } from "@/components/pressable-scale";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/button";
import { CoursePicker } from "@/components/course-picker";
import { Sheet } from "@/components/sheet";
import { IT_FIELDS, isComputing, type Course, type Domain } from "@/constants";
import { projects, type Project } from "@/hooks/use-projects";
import { colors, fonts, lit, radius, type } from "@/theme";

// The manuscript's field, detected during the analysis: the panel follows it (who sits, what the field expert asks;
// plan F4). The student's own course is only the fallback, so a mismatch gets a note, never a block.
export function FieldCard({ project, readOnly, course }: { project: Project; readOnly: boolean; course: Course | null }) {
  const field = project.analysis?.field;
  const unsure = !!field && !!project.analysis?.unsure.includes("field");
  const computing = isComputing(field ?? null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<{ field: Course | null; domain: Domain }>({ field: field ?? null, domain: project.domain });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const edit = () => {
    setDraft({ field: field ?? course, domain: computing ? project.domain : IT_FIELDS[0] });
    setError("");
    setOpen(true);
  };

  const save = async () => {
    if (!draft.field) return;
    setSaving(true);
    setError("");
    try {
      await projects.saveAnalysis(project.id, { field: draft.field }, false, isComputing(draft.field) ? draft.domain : "General");
      setOpen(false);
    } catch {
      setError("Couldn't save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const label = field ? (computing && project.domain !== "General" ? `${field} · ${project.domain}` : field) : "Not detected";

  return (
    <View style={[styles.card, unsure && styles.unsure]}>
      <View style={styles.head}>
        <Text style={styles.title}>FIELD</Text>
        {unsure ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>AI unsure</Text>
          </View>
        ) : null}
        {!readOnly ? (
          <PressableScale accessibilityRole="button" accessibilityLabel="Change field" onPress={edit} hitSlop={8} style={styles.edit}>
            <Text style={styles.editText}>Change</Text>
          </PressableScale>
        ) : null}
      </View>
      <Text style={styles.value}>{label}</Text>
      <Text style={styles.meta}>
        {field ? "From your manuscript. The panel is set up for this field." : `Using your course${course ? ` (${course})` : ""} for the panel.`}
      </Text>
      {field && course && field !== course ? (
        <Text style={styles.note}>
          {`Your course is ${course}, but this reads like a ${field} study, so the panel will question it as ${field}.${readOnly ? "" : " Change it if that's wrong."}`}
        </Text>
      ) : null}

      <Sheet visible={open} onClose={() => !saving && setOpen(false)}>
        <Text style={styles.sheetTitle}>{"The manuscript's field"}</Text>
        <Text style={styles.sheetBody}>The panel and its questions follow this.</Text>
        <View style={styles.picker}>
          <CoursePicker value={draft.field} onPick={(f) => setDraft((d) => ({ ...d, field: f }))} />
        </View>
        {isComputing(draft.field) ? (
          <>
            <Text style={[type.label, styles.itLabel]}>IT FIELD</Text>
            <View accessibilityRole="radiogroup" accessibilityLabel="IT field" style={styles.chips}>
              {IT_FIELDS.map((d) => {
                const selected = d === draft.domain;
                return (
                  <PressableScale
                    key={d}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    onPress={() => setDraft((x) => ({ ...x, domain: d }))}
                    style={[styles.chip, selected && styles.chipSelected]}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{d}</Text>
                  </PressableScale>
                );
              })}
            </View>
          </>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.save}>
          <Button label={saving ? "Saving…" : "Save"} busy={saving} disabled={saving || !draft.field} onPress={save} />
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...lit,
    backgroundColor: colors.sand,
    borderRadius: radius.xl,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  unsure: { borderColor: colors.amber },
  head: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 28 },
  title: { ...type.label, flex: 1 },
  badge: { backgroundColor: colors.amberTint, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3 },
  badgeText: { fontFamily: fonts.body, fontWeight: "600", fontSize: 11, color: colors.amberInk },
  edit: { minHeight: 30, paddingVertical: 5, paddingHorizontal: 12, borderRadius: 15, backgroundColor: colors.paper, justifyContent: "center" },
  editText: { fontFamily: fonts.body, fontWeight: "600", fontSize: 12, color: colors.ink },
  value: { ...type.heading, marginTop: 4 },
  meta: { ...type.meta, lineHeight: 17, marginTop: 2 },
  note: { ...type.body, fontSize: 13, lineHeight: 19, color: colors.inkMuted, marginTop: 8 },
  sheetTitle: { ...type.title, fontSize: 26, lineHeight: 28, letterSpacing: -0.8 },
  sheetBody: { ...type.body, color: colors.inkMuted, marginTop: 8 },
  picker: { marginTop: 16 },
  itLabel: { marginTop: 16, marginBottom: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { minHeight: 44, borderRadius: 22, paddingHorizontal: 16, justifyContent: "center", backgroundColor: colors.sand },
  chipSelected: { backgroundColor: colors.fill },
  chipText: { fontFamily: fonts.body, fontWeight: "500", fontSize: 14, color: colors.ink },
  chipTextSelected: { color: colors.onFill },
  error: { ...type.meta, color: colors.warnInk, marginTop: 8 },
  save: { marginTop: 16 },
});
