import { useState } from "react";
import { KeyboardAvoidingView, StyleSheet, Text, TextInput, View } from "react-native";

import { Button } from "@/components/button";
import { Screen } from "@/components/screen";
import { session } from "@/hooks/use-session";
import { colors, radius, type } from "@/theme";

// ponytail: every path calls the session.signIn stub. Firebase Auth (Google + email,
// register, forgot password) replaces it in Sprint 1.
export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.flex}>
      <Screen title={"Keep your\nsessions safe."} subtitle="Sign in so your scores and history follow you.">
        <View style={styles.google}>
          <Button
            variant="secondary"
            label="Continue with Google"
            onPress={session.signIn}
            leading={<Text style={styles.g}>G</Text>}
          />
        </View>

        <View style={styles.or}>
          <View style={styles.rule} />
          <Text style={type.meta}>or</Text>
          <View style={styles.rule} />
        </View>

        <Field label="School email" value={email} onChangeText={setEmail} autoComplete="email" keyboardType="email-address" />
        <Field label="Password" value={password} onChangeText={setPassword} autoComplete="current-password" secureTextEntry />

        <View style={styles.spacer} />
        <Button label="Sign in" onPress={session.signIn} disabled={!email || !password} />
      </Screen>
    </KeyboardAvoidingView>
  );
}

function Field({ label, ...input }: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        autoCapitalize="none"
        placeholderTextColor={colors.faint}
        style={styles.input}
        {...input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  google: { marginTop: 28 },
  g: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.paper,
    textAlign: "center",
    lineHeight: 22,
    ...type.meta,
    fontWeight: "700",
    color: colors.ink,
  },
  or: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 22, marginBottom: 16 },
  rule: { flex: 1, height: 1, backgroundColor: colors.border },
  field: { backgroundColor: colors.sand, borderRadius: radius.lg, paddingVertical: 10, paddingHorizontal: 16, marginBottom: 8 },
  fieldLabel: { ...type.meta, fontSize: 11, fontWeight: "500" },
  input: { ...type.bodyStrong, fontSize: 15, paddingVertical: 4, paddingHorizontal: 0 },
  spacer: { flex: 1, minHeight: 16 },
});
