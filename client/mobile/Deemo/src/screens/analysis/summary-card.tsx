import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { colors, fonts, radius, type } from "@/theme";

type Props = {
  title: string;
  body: string; // a list card holds one item per line
  list?: boolean;
  unsure?: boolean;
  onSave: (text: string) => Promise<void>;
};

// One card of "Here's what we understood": read, or edit in place and save.
export function SummaryCard({ title, body, list, unsure, onSave }: Props) {
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const editing = draft !== null;

  const save = async () => {
    if (draft === null) return;
    setSaving(true);
    setFailed(false);
    try {
      await onSave(draft);
      setDraft(null);
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };

  const lines = body.split("\n").filter((l) => l.trim());

  return (
    <View style={[styles.card, unsure && styles.unsure, editing && styles.editing]}>
      <View style={styles.head}>
        <Text style={styles.label}>{title}</Text>
        {unsure && !editing ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>AI unsure</Text>
          </View>
        ) : null}
        {!editing ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edit ${title.toLowerCase()}`}
            onPress={() => setDraft(body)}
            hitSlop={8}
            style={styles.edit}
          >
            <Text style={styles.editText}>Edit</Text>
          </Pressable>
        ) : null}
      </View>

      {editing ? (
        <>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            multiline
            autoFocus
            textAlignVertical="top"
            accessibilityLabel={title}
            style={styles.input}
          />
          {list ? <Text style={styles.hint}>One per line.</Text> : null}
          {failed ? <Text style={styles.error}>{"Couldn't save. Try again."}</Text> : null}
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" disabled={saving} onPress={() => setDraft(null)} style={styles.cancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={saving} onPress={save} style={[styles.save, saving && styles.dim]}>
              <Text style={styles.saveText}>{saving ? "Saving…" : "Save"}</Text>
            </Pressable>
          </View>
        </>
      ) : list ? (
        <View style={styles.items}>
          {lines.map((l, i) => (
            <Text key={i} style={styles.body}>
              • {l}
            </Text>
          ))}
        </View>
      ) : (
        <Text style={[styles.body, !body.trim() && styles.empty]}>{body.trim() || "Not found in the manuscript."}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.sand, borderRadius: radius.xl, paddingVertical: 14, paddingHorizontal: 16, borderWidth: 1.5, borderColor: "transparent" },
  unsure: { borderColor: "rgba(235,179,83,0.7)" },
  editing: { borderColor: colors.dusk },
  head: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 28 },
  label: { ...type.label, flex: 1 },
  badge: { backgroundColor: colors.amberTint, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3 },
  badgeText: { fontFamily: fonts.body, fontWeight: "600", fontSize: 11, color: colors.amberInk },
  edit: { height: 30, paddingHorizontal: 12, borderRadius: 15, backgroundColor: colors.paper, justifyContent: "center" },
  editText: { fontFamily: fonts.body, fontWeight: "600", fontSize: 12, color: colors.ink },
  body: { ...type.body, lineHeight: 20.5, marginTop: 4 },
  empty: { color: colors.muted },
  items: { gap: 2 },
  input: {
    ...type.body,
    minHeight: 96,
    marginTop: 6,
    borderRadius: radius.md,
    backgroundColor: colors.paper,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  hint: { ...type.meta, marginTop: 6 },
  error: { ...type.meta, color: colors.clay, marginTop: 6 },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 8 },
  cancel: { height: 38, paddingHorizontal: 14, borderRadius: 19, justifyContent: "center" },
  cancelText: { fontFamily: fonts.body, fontWeight: "500", fontSize: 13, color: colors.ink },
  save: { height: 38, paddingHorizontal: 18, borderRadius: 19, backgroundColor: colors.ink, justifyContent: "center" },
  saveText: { fontFamily: fonts.body, fontWeight: "600", fontSize: 13, color: colors.paper },
  dim: { opacity: 0.6 },
});
