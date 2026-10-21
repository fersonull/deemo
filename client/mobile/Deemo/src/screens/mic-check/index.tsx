import { useNetInfo } from "@react-native-community/netinfo";
import { router } from "expo-router";
import { Linking, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { Button } from "@/components/button";
import { DeemoNote } from "@/components/deemo-note";
import { Icon } from "@/components/icon";
import { Screen } from "@/components/screen";
import { useEarphones } from "@/hooks/use-earphones";
import { useMicCheck } from "@/hooks/use-mic-check";
import { colors, lit, radius, type } from "@/theme";

const VOICED_TARGET_MS = 2000; // about one spoken sentence

type Check = { icon: string; label: string; meta: string; color: string };

export function MicCheck() {
  const { status, levels, voicedMs } = useMicCheck();
  const earphones = useEarphones();
  const net = useNetInfo();

  const heard = voicedMs >= VOICED_TARGET_MS;
  const offline = net.isConnected === false || net.isInternetReachable === false;

  const checks: Check[] = [
    earphones
      ? { icon: "headphones", label: "Earphones connected", meta: earphones === "bluetooth" ? "Bluetooth" : "Wired", color: colors.sage }
      : { icon: "headphones", label: "No earphones found", meta: "The panel may echo", color: colors.amber },
    heard
      ? { icon: "check_circle", label: "Sounds clear", meta: "Good level", color: colors.sage }
      : { icon: "graphic_eq", label: "Listening…", meta: `${Math.round((voicedMs / VOICED_TARGET_MS) * 100)}%`, color: colors.dusk },
    offline
      ? { icon: "wifi_off", label: "No connection", meta: "The panel needs internet", color: colors.amber }
      : net.isInternetReachable
        ? { icon: "wifi", label: "Connection ready", meta: net.type === "wifi" ? "Wi-Fi" : "Mobile data", color: colors.sage }
        : { icon: "wifi", label: "Checking connection…", meta: "", color: colors.dusk },
  ];

  return (
    <Screen
      onBack={() => router.back()}
      title={"Quick sound\ncheck."}
      subtitle="Read this out loud, at the volume you'll use with the panel:"
    >
      <Text style={styles.script}>{'"Good evening, panel. My name is …, and this is our study."'}</Text>
      {/* Deemo's tip (design D3); Deemo never goes into the room itself. */}
      {earphones ? null : (
        // Fades in after a beat, so it doesn't flash while connected earphones are still being detected.
        <Animated.View entering={FadeIn.delay(600).duration(200)} style={styles.tip}>
          <DeemoNote>Earphones in? They keep the panel from hearing itself.</DeemoNote>
        </Animated.View>
      )}

      {status === "denied" ? (
        <View style={styles.denied}>
          <Icon name="mic_off" size={22} color={colors.duskIcon} />
          <Text style={styles.deniedText}>
            DEEMO needs your microphone so the panel can hear your answers. Nothing is recorded.
          </Text>
          <Button variant="secondary" label="Open settings" onPress={() => Linking.openSettings()} />
        </View>
      ) : (
        <>
          <View style={styles.meter} accessibilityLabel="Microphone level">
            {levels.map((l, i) => {
              const h = Math.max(6, Math.round(64 * l));
              return <View key={i} style={[styles.bar, { height: h, backgroundColor: h > 10 ? colors.dusk : colors.border }]} />;
            })}
          </View>
          {status === "error" && <Text style={styles.error}>{"The microphone didn't start. Go back and try again."}</Text>}
          <View style={styles.checks}>
            {checks.map((c) => (
              <View key={c.icon} style={styles.check} accessible accessibilityLabel={`${c.label}. ${c.meta}`}>
                <Icon name={c.icon} color={c.color} filled />
                <Text style={[type.bodyStrong, styles.flex]}>{c.label}</Text>
                <Text style={[type.meta, styles.meta]}>{c.meta}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      <View style={styles.flex} />
      <Button label="Enter the room" disabled={!heard || offline} onPress={() => router.push("/session")} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  script: { ...type.heading, fontSize: 21, lineHeight: 26, letterSpacing: -0.2, marginTop: 16 },
  tip: { marginTop: 16 },
  meter: {
    height: 96,
    marginTop: 24,
    backgroundColor: colors.sand,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 18,
  },
  bar: { width: 6, borderRadius: 3 },
  error: { ...type.body, color: colors.warnInk, marginTop: 8 },
  checks: { gap: 2, marginTop: 16 },
  check: { flexDirection: "row", alignItems: "center", gap: 12, height: 44 },
  meta: { fontSize: 12.5 },
  denied: { ...lit, marginTop: 24, backgroundColor: colors.sand, borderRadius: radius.lg, padding: 16, gap: 12 },
  deniedText: { ...type.body },
});
