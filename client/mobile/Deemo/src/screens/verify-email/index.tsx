import { PressableScale } from "@/components/pressable-scale";
import { useEffect, useState } from "react";
import { AppState, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { Button } from "@/components/button";
import type { DeemoMood } from "@/components/deemo";
import { DeemoNote } from "@/components/deemo-note";
import { Screen } from "@/components/screen";
import { authMessage, session, useSession } from "@/hooks/use-session";
import { colors, easeOut, fonts, radius, type } from "@/theme";

const COOLDOWN = 60; // seconds between links (Firebase throttles faster resends anyway)
const POLL_MS = 5000;

const STEPS = [
  "Open the email from DEEMO. Check Spam or Promotions if it isn't in your inbox.",
  "Tap the verification link. It opens in your browser.",
  "Come back here. DEEMO lets you in on its own.",
];

// Verify your email (after an email + password sign-up, or signing in to an account that never verified).
// The server only serves verified emails, so the root layout keeps the student here until Firebase says the link was
// tapped: checked when the app comes back to the front, every few seconds while it's open, and on the button.
export function VerifyEmail() {
  const { email, verifySentAt } = useSession();
  const [busy, setBusy] = useState<"check" | "resend" | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [now, setNow] = useState(() => Date.now());

  const wait = Math.max(0, Math.ceil(COOLDOWN - (now - verifySentAt) / 1000));

  // Tick the resend countdown.
  useEffect(() => {
    if (!wait) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [wait]);

  // Most students leave for their email app and come back: check then, and keep checking quietly while here.
  useEffect(() => {
    const quiet = () => void session.checkVerified().catch(() => {});
    const sub = AppState.addEventListener("change", (s) => s === "active" && quiet());
    const poll = setInterval(() => AppState.currentState === "active" && quiet(), POLL_MS);
    return () => {
      sub.remove();
      clearInterval(poll);
    };
  }, []);

  const check = async () => {
    setBusy("check");
    setError("");
    setNote("");
    try {
      if (!(await session.checkVerified())) setNote("I don't see it yet. Tap the link in the email, then try again.");
    } catch (e) {
      setError(authMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const resend = async () => {
    setBusy("resend");
    setError("");
    setNote("");
    try {
      await session.resendVerification();
      setNow(Date.now());
      setNote(`I sent a new link to ${email}. Use the newest one.`);
    } catch (e) {
      setError(authMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const [say, mood]: [string, DeemoMood] = error
    ? [error, "idle"]
    : note
      ? [note, "encouraging"]
      : verifySentAt
        ? ["One last step. Tap the link I emailed you so I know this address is yours.", "cheering"]
        : ["This email isn't verified yet. Send yourself a link, then tap it.", "encouraging"];

  return (
    <Screen scroll title={"Check your\ninbox."}>
      <Text style={styles.subtitle}>
        {verifySentAt ? "We've sent a verification link to " : "We'll send a verification link to "}
        <Text style={styles.email}>{email}</Text>.
      </Text>

      <View style={styles.deemo} accessibilityLiveRegion="polite">
        <Animated.View key={say} entering={FadeIn.duration(200).easing(easeOut)}>
          <DeemoNote mood={mood} size="m" startle={!!error}>
            {say}
          </DeemoNote>
        </Animated.View>
      </View>

      <View style={styles.steps}>
        {STEPS.map((s, i) => (
          <View key={i} style={styles.step}>
            <Text style={styles.num}>{i + 1}</Text>
            <Text style={styles.stepText}>{s}</Text>
          </View>
        ))}
      </View>

      <View style={styles.cta}>
        <Button
          label={busy === "check" ? "Checking…" : "I've verified my email"}
          onPress={check}
          busy={busy === "check"}
          disabled={!!busy}
        />
        <Button
          variant="secondary"
          label={busy === "resend" ? "Sending…" : wait ? `Resend link in 0:${String(wait).padStart(2, "0")}` : "Resend link"}
          onPress={resend}
          busy={busy === "resend"}
          disabled={!!busy || wait > 0}
        />
      </View>

      <PressableScale
        accessibilityRole="button"
        disabled={!!busy}
        onPress={() => void session.signOut()}
        style={styles.switch}
      >
        <Text style={styles.switchText}>Wrong email? Use a different one</Text>
      </PressableScale>
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: { ...type.body, color: colors.inkMuted, marginTop: 8 },
  email: { fontFamily: fonts.body, fontWeight: "600", color: colors.ink },
  deemo: { marginTop: 18, minHeight: 68 },
  steps: { gap: 8, marginTop: 18 },
  step: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.sand,
    borderRadius: radius.lg,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  num: { ...type.label, fontSize: 12, width: 14, textAlign: "center", color: colors.duskIcon },
  stepText: { ...type.body, flex: 1, fontSize: 13.5, lineHeight: 19.5 },
  cta: { gap: 10, marginTop: 24 },
  switch: { height: 48, alignItems: "center", justifyContent: "center", marginTop: 4 },
  switchText: { fontFamily: fonts.body, fontWeight: "600", fontSize: 14, color: colors.ink },
});
