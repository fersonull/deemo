import { useState } from "react";
import { Keyboard, StyleSheet, Text, TextInput, View } from "react-native";
import { Button } from "@/components/button";
import { Sheet } from "@/components/sheet";
import { projects, type Project } from "@/hooks/use-projects";
import { colors, fonts, radius, type } from "@/theme";

export function JoinSheet({
  visible,
  onClose,
  onJoined,
}: {
  visible: boolean;
  onClose: () => void;
  onJoined: (p: Project) => void;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const join = async () => {
    Keyboard.dismiss();
    setBusy(true);
    setError("");
    try {
      const p = await projects.join(code);
      setCode("");
      onJoined(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't join. Try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet visible={visible} onClose={busy ? () => {} : onClose}>
      <Text style={type.title}>Join your group</Text>
      <Text style={styles.note}>
        Six characters from your leader. You share the manuscript and rubric; your sessions stay private.
      </Text>
      <TextInput
        accessibilityLabel="Group code"
        value={code}
        onChangeText={(v) => setCode(v.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={6}
        placeholder="ABC234"
        placeholderTextColor={colors.faint}
        editable={!busy}
        style={styles.input}
        returnKeyType="done"
        onSubmitEditing={() => code.length === 6 && !busy && void join()}
      />
      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <View style={styles.cta}>
        <Button label={busy ? "Joining…" : "Join group"} busy={busy} disabled={busy || code.length !== 6} onPress={join} />
      </View>
    </Sheet>
  );
}
const styles = StyleSheet.create({
  note: { ...type.body, color: colors.inkMuted, marginTop: 8 },
  input: {
    fontFamily: fonts.mono,
    fontSize: 25,
    color: colors.ink,
    backgroundColor: colors.sand,
    borderRadius: radius.lg,
    textAlign: "center",
    letterSpacing: 6,
    padding: 14,
    marginTop: 18,
  },
  error: { ...type.meta, color: colors.clay, marginTop: 8 },
  cta: { marginTop: 16 },
});
