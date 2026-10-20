import * as DocumentPicker from "expo-document-picker";
import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import { Sheet } from "@/components/sheet";
import { projects, type PickedFile, type Project } from "@/hooks/use-projects";
import { colors, fonts, radius, type } from "@/theme";
import { PressableScale } from "@/components/pressable-scale";

const PDF = "application/pdf";
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const MAX_MB = 20; // server/src/modules/manuscripts/domain/manuscript.ts MAX_BYTES

const mb = (bytes?: number) => (bytes ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : "");
const nameFrom = (f: PickedFile | null) => (f ? f.name.replace(/\.(pdf|docx)$/i, "").replace(/[_-]+/g, " ") : "");

type Props = { visible: boolean; onClose: () => void; onUploaded: (p: Project) => void };

// "Add your manuscript" (prototype upload sheet, plan S-06).
export function UploadSheet({ visible, onClose, onUploaded }: Props) {
  const [file, setFile] = useState<PickedFile | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const pick = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: [PDF, DOCX], copyToCacheDirectory: true });
    if (r.canceled) return;
    const f = r.assets[0];
    setError(f.size && f.size > MAX_MB * 1024 * 1024 ? `That file is over ${MAX_MB} MB.` : "");
    // Follow the new file unless the student typed their own name.
    if (!name.trim() || name === nameFrom(file)) setName(nameFrom(f));
    setFile(f);
  };

  const read = async () => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const p = await projects.upload(file, name.trim(), "General") // the analysis detects the field and IT field;
      setFile(null);
      setName("");
      onUploaded(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const tooBig = !!file?.size && file.size > MAX_MB * 1024 * 1024;

  return (
    <Sheet visible={visible} onClose={busy ? () => {} : onClose}>
      <Text style={styles.title}>Add your manuscript</Text>

      <PressableScale

        scaleTo={0.98}
        accessibilityRole="button"
        accessibilityLabel={file ? `Chosen file ${file.name}. Choose another` : "Choose a PDF or DOCX"}
        disabled={busy}
        onPress={pick}
        style={[styles.file, file && !tooBig && styles.fileChosen]}
      >
        <View style={styles.tile}>
          <Icon name={file ? "task" : "upload_file"} size={22} color={colors.duskIcon} />
        </View>
        <View style={styles.flex}>
          <Text style={type.bodyStrong} numberOfLines={1}>
            {file ? file.name : "Choose a PDF or DOCX"}
          </Text>
          <Text style={type.meta}>
            {busy ? "Uploading…" : file ? mb(file.size) : `Up to ${MAX_MB} MB. Text-based PDFs work best.`}
          </Text>
        </View>
      </PressableScale>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Project name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. ReqTrack"
          placeholderTextColor={colors.faint}
          maxLength={80}
          style={styles.input}
          accessibilityLabel="Project name"
        />
      </View>
      <Text style={styles.hint}>{"DEEMO reads your study's field from the manuscript. You can correct it on the summary."}</Text>


      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}

      <View style={styles.cta}>
        <Button label={busy ? "Uploading…" : "Read my manuscript"} onPress={read} busy={busy} disabled={!file || tooBig || busy} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0, gap: 2 },
  title: { ...type.title, fontSize: 26, lineHeight: 28, letterSpacing: -0.8 },
  file: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: radius.xl,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "rgba(42,36,32,0.18)",
    backgroundColor: colors.sand,
  },
  fileChosen: { borderColor: colors.sage },
  tile: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.paper,
    alignItems: "center",
    justifyContent: "center",
  },
  field: { marginTop: 8, backgroundColor: colors.sand, borderRadius: radius.lg, paddingVertical: 10, paddingHorizontal: 16 },
  fieldLabel: { fontFamily: fonts.body, fontWeight: "500", fontSize: 11, color: colors.muted },
  input: { fontFamily: fonts.body, fontWeight: "500", fontSize: 15, color: colors.ink, paddingVertical: 4, paddingHorizontal: 0 },
  hint: { ...type.meta, lineHeight: 17, marginTop: 6, paddingHorizontal: 4 },
  error: { ...type.body, fontSize: 13, color: colors.warnInk, marginTop: 10, paddingHorizontal: 4 },
  cta: { marginTop: 16 },
});
