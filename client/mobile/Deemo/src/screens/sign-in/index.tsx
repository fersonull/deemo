import { useState } from "react";
import { KeyboardAvoidingView, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { Button } from "@/components/button";
import { Screen } from "@/components/screen";
import { authMessage, session } from "@/hooks/use-session";
import { colors, fonts, radius, type } from "@/theme";

// Sign in (plan S-04): Google, or school email + password. Firebase Auth keeps the student signed in;
// the root layout moves on once it reports the new user.
export function SignIn() {
  const [creating, setCreating] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    setNote("");
    try {
      await action();
    } catch (e) {
      setError(authMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const submit = () => run(() => (creating ? session.createAccount(email, password) : session.signInWithEmail(email, password)));

  const reset = () =>
    run(async () => {
      await session.resetPassword(email);
      setNote(`We sent a reset link to ${email.trim()}.`);
    });

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.flex}>
      <Screen
        title={creating ? "Make your\naccount." : "Keep your\nsessions safe."}
        subtitle="Sign in so your scores and history follow you."
      >
        <View style={styles.google}>
          <Button
            variant="secondary"
            label="Continue with Google"
            disabled={busy}
            onPress={() => run(() => session.signInWithGoogle())}
            leading={<Text style={styles.g}>G</Text>}
          />
        </View>

        <View style={styles.or}>
          <View style={styles.rule} />
          <Text style={type.meta}>or</Text>
          <View style={styles.rule} />
        </View>

        <Field label="School email" value={email} onChangeText={setEmail} autoComplete="email" keyboardType="email-address" />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          autoComplete={creating ? "new-password" : "current-password"}
          secureTextEntry
          onSubmitEditing={submit}
        />

        {!creating ? (
          <Pressable accessibilityRole="button" disabled={busy || !email.trim()} onPress={reset} style={styles.link}>
            <Text style={[styles.linkText, !email.trim() && styles.dim]}>Forgot password?</Text>
          </Pressable>
        ) : null}

        {error ? (
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
        {note ? (
          <Text style={styles.note} accessibilityLiveRegion="polite">
            {note}
          </Text>
        ) : null}

        <View style={styles.spacer} />
        <Button label={creating ? "Create account" : "Sign in"} onPress={submit} disabled={busy || !email.trim() || !password} />
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setCreating(!creating);
            setError("");
            setNote("");
          }}
          style={styles.switch}
        >
          <Text style={styles.switchText}>{creating ? "Have an account? Sign in" : "New here? Create an account"}</Text>
        </Pressable>
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
  link: { alignSelf: "flex-end", height: 40, justifyContent: "center", paddingHorizontal: 4 },
  linkText: { fontFamily: fonts.body, fontWeight: "600", fontSize: 13, color: colors.duskLink },
  dim: { opacity: 0.4 },
  error: { ...type.body, fontSize: 13, color: colors.clay, marginTop: 4, paddingHorizontal: 4 },
  note: { ...type.body, fontSize: 13, color: colors.sageInk, marginTop: 4, paddingHorizontal: 4 },
  spacer: { flex: 1, minHeight: 16 },
  switch: { height: 48, alignItems: "center", justifyContent: "center", marginTop: 4 },
  switchText: { fontFamily: fonts.body, fontWeight: "600", fontSize: 14, color: colors.ink },
});
