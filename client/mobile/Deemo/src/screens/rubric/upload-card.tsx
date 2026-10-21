import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";

import { Icon } from "@/components/icon";
import { PressableScale } from "@/components/pressable-scale";
import type { Rubric } from "@/hooks/use-projects";
import { colors, radius, type } from "@/theme";
import { api } from "@/utils/api";
import { riseIn } from "@/utils/motion";

const TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
];

// "Upload mine" (prototype rubric screen, plan F3): the panel's own form (PDF, DOCX or a photo) read into a whole new
// rubric that replaces the default. It lands in the editor below; the student still reviews it and taps "Use".
export function UploadCard({ onRubric }: { onRubric: (rubric: Rubric) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Rubric | null>(null);
  const reduced = useReducedMotion();

  const pick = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: TYPES, copyToCacheDirectory: true });
    if (r.canceled) return;
    const file = r.assets[0];
    if (file.size && file.size > 10_000_000) return setError("That file is over 10 MB.");
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", new File(file.uri) as unknown as Blob);
      const rubric = await api<Rubric>("/rubric/map", { method: "POST", body: form });
      setResult(rubric);
      onRubric(rubric);
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't read this rubric.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      <PressableScale
        accessibilityRole="button"
        accessibilityHint="Choose a PDF, Word file or photo of your panel's rubric"
        accessibilityState={{ disabled: busy, busy }}
        disabled={busy}
        onPress={pick}
        style={[styles.card]}
      >
        <View style={styles.tile}>
          <Icon name={result ? "task" : "upload_file"} size={22} color={colors.duskIcon} />
        </View>
        <View style={styles.flex}>
          <Text style={type.bodyStrong}>
            {busy ? "Reading your rubric…" : result ? "Upload a different rubric" : "Use your panel's rubric"}
          </Text>
          <Text style={type.meta}>
            {busy ? "Usually a few seconds; up to a minute when the AI is busy." : "PDF, Word or a photo. It replaces the default criteria."}
          </Text>
        </View>
      </PressableScale>

      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}

      {result && !busy ? (
        <Animated.View entering={riseIn(0, reduced)} style={styles.mapped} accessibilityLiveRegion="polite">
          <Text style={type.label}>FROM YOUR PANEL&apos;S FORM</Text>
          <Text style={styles.line}>
            {`${result.criteria.length} criteria, weighted the way your form weighs them. Review them below, then tap "Use this rubric".`}
          </Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0, gap: 2 },
  card: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: radius.xl,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: colors.borderStrong,
  },
  tile: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.sand,
    alignItems: "center",
    justifyContent: "center",
  },
  error: { ...type.body, fontSize: 13, color: colors.clay, marginTop: 8, paddingHorizontal: 4 },
  mapped: { backgroundColor: colors.duskTint, borderRadius: radius.lg, padding: 14, marginTop: 10, gap: 4 },
  line: { ...type.body, fontSize: 13.5, lineHeight: 19 },
});
