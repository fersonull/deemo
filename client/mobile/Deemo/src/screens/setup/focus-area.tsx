import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Button } from "@/components/button";
import { projects, type Project } from "@/hooks/use-projects";
import { colors, radius, type } from "@/theme";

export function FocusArea({ project }: { project: Project }) {
  const saved = project.group?.focusArea ?? "";
  const [draft, setDraft] = useState(saved);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      await projects.updateMember(project, { focusArea: draft.trim() });
      setDraft(draft.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save your focus area.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={styles.card}>
      <Text style={type.label}>YOUR FOCUS AREA · OPTIONAL</Text>
      <Text style={styles.note}>Tell the panel which chapter or role you handle. Saved just for you in this group.</Text>
      <TextInput
        accessibilityLabel="Your focus area"
        value={draft}
        onChangeText={setDraft}
        maxLength={160}
        editable={!busy}
        placeholder="e.g. Database design and testing"
        placeholderTextColor={colors.muted}
        style={styles.input}
      />
      {draft !== saved ? <Button label={busy ? "Saving…" : "Save focus area"} busy={busy} disabled={busy} onPress={save} /> : null}
      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  card: { marginTop: 24 },
  note: { ...type.meta, lineHeight: 18, marginTop: 8 },
  input: { ...type.body, backgroundColor: colors.sand, borderRadius: radius.lg, padding: 14, marginVertical: 10 },
  error: { ...type.meta, color: colors.warnInk, marginTop: 8 },
});
