import { PressableScale } from "@/components/pressable-scale";
import { useState } from "react";
import { KeyboardAvoidingView, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";

import { Button } from "@/components/button";
import type { DeemoMood } from "@/components/deemo";
import { DeemoNote } from "@/components/deemo-note";
import { Icon } from "@/components/icon";
import { Screen } from "@/components/screen";
import { authMessage, session } from "@/hooks/use-session";
import { colors, easeOut, fonts, radius, type } from "@/theme";
import { canCreate, confirmProblem, MAX_NAME, MIN_PASSWORD } from "@/utils/auth-form";
import { riseIn } from "@/utils/motion";

// Sign in (plan S-04): Google, or school email + password; creating an account asks for a name and the password twice.
// Firebase Auth keeps the student signed in; the root layout moves on once it reports the new user.
// Deemo sits at the top and does the talking: a hello, then whatever just happened (an error, a sent reset link).
// An error makes Deemo shake its head with a nervous face for a moment before it settles back.
// Errors live there, near the top, so the keyboard never covers them; a mismatched confirmation shows under its field.
export function SignIn() {
  const reduced = useReducedMotion();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [greeted, setGreeted] = useState(false); // Deemo waves once, then idles
  const [showPassword, setShowPassword] = useState(false);

  const mismatch = creating ? confirmProblem(password, confirm) : null;
  const ready = creating ? canCreate(name, email, password, confirm) : !!email.trim() && !!password;

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setGreeted(true);
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

  const submit = () => {
    if (!ready || busy) return;
    void run(() => (creating ? session.createAccount(name, email, password) : session.signInWithEmail(email, password)));
  };

  const reset = () =>
    run(async () => {
      await session.resetPassword(email);
      setNote(`I sent a reset link to ${email.trim()}. Check your inbox, then come back here.`);
    });

  const switchMode = () => {
    setCreating(!creating);
    setConfirm("");
    setError("");
    setNote("");
    setGreeted(true);
  };

  // What Deemo says, and how it looks saying it.
  const [say, mood]: [string, DeemoMood] = busy
    ? [creating ? "Setting up your account…" : "Checking your details…", "reading"]
    : error
      ? [error, "idle"] // after a startled shake (below), Deemo settles back to its usual face
      : note
        ? [note, "cheering"]
        : creating
          ? ["Hi, I'm Deemo. Make an account and your scores and history stay with you.", greeted ? "idle" : "waving"]
          : ["Welcome back. Sign in and pick up where you left off.", greeted ? "idle" : "waving"];

  const eye = (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={showPassword ? "Hide passwords" : "Show passwords"}
      hitSlop={10}
      onPress={() => setShowPassword(!showPassword)}
      style={styles.eye}
    >
      <Icon name={showPassword ? "visibility_off" : "visibility"} size={20} color={colors.inkMuted} />
    </PressableScale>
  );

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.flex}>
      <Screen scroll title={creating ? "Make your\naccount." : "Keep your\nsessions safe."}>
        {/* Deemo's bubble: the words fade in when they change; screen readers hear each new message */}
        <View style={styles.deemo} accessibilityLiveRegion="polite">
          <Animated.View key={say} entering={FadeIn.duration(200).easing(easeOut)}>
            <DeemoNote mood={mood} size="m" startle={!!error && !busy}>
              {say}
            </DeemoNote>
          </Animated.View>
        </View>

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
          <Text style={type.meta}>or with email</Text>
          <View style={styles.rule} />
        </View>

        {creating ? (
          <Animated.View entering={riseIn(0, reduced)}>
            <Field
              label="Your name"
              placeholder="Juan Dela Cruz"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              maxLength={MAX_NAME}
              returnKeyType="next"
            />
          </Animated.View>
        ) : null}
        <Field
          label="School email"
          placeholder="juan.delacruz@school.edu.ph"
          value={email}
          onChangeText={setEmail}
          autoComplete="email"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="next"
          invalid={!!error && /email/i.test(error)}
        />
        <Field
          label="Password"
          placeholder={creating ? "At least 6 characters" : "Your password"}
          value={password}
          onChangeText={setPassword}
          autoComplete={creating ? "new-password" : "current-password"}
          secureTextEntry={!showPassword}
          returnKeyType={creating ? "next" : "go"}
          onSubmitEditing={creating ? undefined : submit}
          invalid={!!error && /password/i.test(error)}
          trailing={eye}
        />
        {creating ? (
          <Animated.View entering={riseIn(0, reduced)}>
            <Text style={[styles.hint, password.length >= MIN_PASSWORD && styles.hintMet]}>
              {password.length >= MIN_PASSWORD ? "✓ " : ""}At least {MIN_PASSWORD} characters
            </Text>
            <Field
              label="Confirm password"
              placeholder="Type it again"
              value={confirm}
              onChangeText={setConfirm}
              autoComplete="new-password"
              secureTextEntry={!showPassword}
              returnKeyType="go"
              onSubmitEditing={submit}
              invalid={!!mismatch}
            />
            {mismatch ? (
              <Text style={styles.fieldError} accessibilityLiveRegion="polite">
                {mismatch}
              </Text>
            ) : null}
          </Animated.View>
        ) : (
          <PressableScale accessibilityRole="button" disabled={busy || !email.trim()} onPress={reset} style={styles.link}>
            <Text style={[styles.linkText, !email.trim() && styles.dim]}>Forgot password?</Text>
          </PressableScale>
        )}

        <View style={styles.cta}>
          <Button
            label={busy ? (creating ? "Creating your account…" : "Signing in…") : creating ? "Create account" : "Sign in"}
            onPress={submit}
            busy={busy}
            disabled={!ready}
          />
        </View>
        <PressableScale accessibilityRole="button" onPress={switchMode} style={styles.switch}>
          <Text style={styles.switchText}>{creating ? "Have an account? Sign in" : "New here? Create an account"}</Text>
        </PressableScale>
      </Screen>
    </KeyboardAvoidingView>
  );
}

// A sand field that shows where you're typing: the border turns dusk while it has focus, amber when it's wrong.
function Field({
  label,
  trailing,
  invalid,
  ...input
}: { label: string; trailing?: React.ReactNode; invalid?: boolean } & React.ComponentProps<typeof TextInput>) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.field, focused && styles.fieldFocused, invalid && styles.fieldInvalid]}>
      <View style={styles.flex}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <TextInput
          accessibilityLabel={label}
          accessibilityHint={invalid ? "Needs a fix" : undefined}
          autoCapitalize="none"
          placeholderTextColor={colors.faint}
          style={styles.input}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...input}
        />
      </View>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  deemo: { marginTop: 14, minHeight: 68 }, // room for two lines, so short and long messages don't shift the form
  google: { marginTop: 16 },
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
  or: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 20, marginBottom: 14 },
  rule: { flex: 1, height: 1, backgroundColor: colors.border },
  field: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.sand,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: "transparent",
    paddingVertical: 9,
    paddingHorizontal: 15,
    marginBottom: 8,
  },
  fieldFocused: { borderColor: colors.dusk },
  fieldInvalid: { borderColor: colors.amber },
  eye: { width: 40, height: 40, alignItems: "center", justifyContent: "center", marginRight: -8 },
  fieldLabel: { ...type.meta, fontSize: 11, fontWeight: "500" },
  input: { ...type.bodyStrong, fontSize: 15, paddingVertical: 4, paddingHorizontal: 0 },
  hint: { ...type.meta, marginTop: -2, marginBottom: 10, paddingHorizontal: 4 },
  hintMet: { color: colors.sageInk },
  fieldError: { ...type.body, fontSize: 13, color: colors.warnInk, marginTop: -2, paddingHorizontal: 4 },
  link: { alignSelf: "flex-end", height: 40, justifyContent: "center", paddingHorizontal: 4 },
  linkText: { fontFamily: fonts.body, fontWeight: "600", fontSize: 13, color: colors.duskLink },
  dim: { opacity: 0.4 },
  cta: { marginTop: 18 },
  switch: { height: 48, alignItems: "center", justifyContent: "center", marginTop: 4 },
  switchText: { fontFamily: fonts.body, fontWeight: "600", fontSize: 14, color: colors.ink },
});
