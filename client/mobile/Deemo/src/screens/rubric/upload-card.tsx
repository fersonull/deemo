import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";

import { Icon } from "@/components/icon";
import { RUBRIC } from "@/constants";
import { colors, radius, type } from "@/theme";
import { api } from "@/utils/api";
import { riseIn } from "@/utils/motion";

const TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
];
const KEYS = ["content", "reasoning", "clarity", "consistency", "delivery"]; // RUBRIC order, server/src/scoring.ts keys

type Mapping = { weights: number[]; mappings: { theirs: string; theirWeight: number; ours: string }[]; uncovered: string[] };

// "Upload mine" (prototype rubric screen, plan F3): the panel's own form (PDF, DOCX or a photo) mapped onto the
// five criteria. The proposed weights land in the editor below; the student still decides and taps "Use".
export function UploadCard({ onWeights }: { onWeights: (weights: number[]) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Mapping | null>(null);
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
      const mapped = await api<Mapping>("/rubric/map", { method: "POST", body: form });
      setResult(mapped);
      onWeights(mapped.weights);
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't read this rubric.");
    } finally {
      setBusy(false);
    }
  };

  const nameOf = (key: string) => RUBRIC[KEYS.indexOf(key)]?.name;

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityHint="Choose a PDF, Word file or photo of your panel's rubric"
        disabled={busy}
        onPress={pick}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        <View style={styles.tile}>
          {busy ? (
            <ActivityIndicator color={colors.dusk} />
          ) : (
            <Icon name={result ? "task" : "upload_file"} size={22} color={colors.duskIcon} />
          )}
        </View>
        <View style={styles.flex}>
          <Text style={type.bodyStrong}>
            {busy ? "Reading your rubric…" : result ? "Upload a different rubric" : "Use your panel's rubric"}
          </Text>
          <Text style={type.meta}>
            {busy ? "This takes a few seconds." : "PDF, Word or a photo. We map it onto these five criteria."}
          </Text>
        </View>
      </Pressable>

      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}

      {result && !busy ? (
        <Animated.View entering={riseIn(0, reduced)} style={styles.mapped} accessibilityLiveRegion="polite">
          <Text style={type.label}>FROM YOUR RUBRIC</Text>
          {result.mappings.map((m, i) => (
            <Text key={i} style={styles.line}>
              {m.theirs}
              {m.ours === "none" ? (
                <Text style={styles.muted}> · not scored (DEEMO scores the oral defense only)</Text>
              ) : (
                <Text style={styles.muted}> → {nameOf(m.ours)}</Text>
              )}
            </Text>
          ))}
          {result.uncovered.length ? (
            <Text style={styles.note}>
              {`Your rubric doesn't weigh ${result.uncovered.join(" or ")}, so ${result.uncovered.length === 1 ? "it's" : "they're"} at 0%. Raise ${result.uncovered.length === 1 ? "it" : "them"} if your panel cares.`}
            </Text>
          ) : null}
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
    borderColor: "rgba(42,36,32,0.18)",
  },
  pressed: { opacity: 0.85 },
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
  muted: { color: colors.inkMuted },
  note: { ...type.meta, lineHeight: 17, color: colors.duskInk, marginTop: 4 },
});
