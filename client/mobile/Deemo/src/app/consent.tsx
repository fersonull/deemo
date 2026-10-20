import { PressableScale } from "@/components/pressable-scale";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";

import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import { Screen } from "@/components/screen";
import { session, useSession } from "@/hooks/use-session";
import { colors, easeOut, radius, type } from "@/theme";
import { ApiError } from "@/utils/api";

const ITEMS = [
  { icon: "description", text: "Your manuscript and voice are processed by Google's AI to run the panel." },
  { icon: "mic_off", text: "No audio is recorded. Only the text transcript is kept." },
  { icon: "lock", text: "Your sessions are private. Share them with your group only if you choose." },
  { icon: "delete", text: "You can delete everything any time from Profile." },
];

// Before sign-in (kept on the device, then recorded on the new account), or for a signed-in account that has no
// consent on record yet (recorded right away; the root layout then moves on to the app).
export default function Consent() {
  const { signedIn } = useSession();
  const [adult, setAdult] = useState(false);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const accept = async () => {
    if (!signedIn) {
      session.consent();
      router.push("/sign-in");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await session.acceptConsent();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't save your consent. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title={"Before you\npractice."} subtitle="What happens to your work, in plain words.">
      <View style={styles.items}>
        {ITEMS.map((c) => (
          <View key={c.icon} style={styles.item}>
            <Icon name={c.icon} size={21} color={colors.duskIcon} />
            <Text style={styles.itemText}>{c.text}</Text>
          </View>
        ))}
      </View>
      <View style={styles.spacer} />
      <Check checked={adult} onToggle={() => setAdult(!adult)} label="I am 18 years old or older." />
      <Check checked={agree} onToggle={() => setAgree(!agree)} label="I understand and agree to how my data is used." />
      <View style={styles.cta}>
        {error ? (
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
        <Button label={busy ? "Saving…" : "Continue"} busy={busy} disabled={!(adult && agree) || busy} onPress={accept} />
      </View>
    </Screen>
  );
}

function Check({ checked, onToggle, label }: { checked: boolean; onToggle: () => void; label: string }) {
  return (
    <PressableScale
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={onToggle}
      style={styles.check}
    >
      <View style={[styles.box, checked && styles.boxOn]}>
        {/* The tick pops in from 0.6 (never from nothing), 160 ms */}
        {checked && (
          <Animated.View entering={ZoomIn.duration(160).easing(easeOut).withInitialValues({ transform: [{ scale: 0.6 }] })}>
            <Icon name="check" size={18} color={colors.paper} />
          </Animated.View>
        )}
      </View>
      <Text style={styles.checkLabel}>{label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  error: { ...type.body, fontSize: 13, color: colors.warnInk, marginBottom: 10, textAlign: "center" },
  items: { gap: 8, marginTop: 20 },
  item: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    backgroundColor: colors.sand,
    borderRadius: radius.lg,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  itemText: { ...type.body, flex: 1, fontSize: 13.5, lineHeight: 19.5 },
  spacer: { flex: 1, minHeight: 16 },
  check: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 48 },
  box: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "rgba(42,36,32,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  boxOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  checkLabel: { ...type.body, flex: 1, lineHeight: 19.6 },
  cta: { marginTop: 10 },
});
