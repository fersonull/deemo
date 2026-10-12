import { useNetInfo } from "@react-native-community/netinfo";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/button";
import { Deemo } from "@/components/deemo";
import { colors, type } from "@/theme";
import { lastApiFailure } from "@/utils/api";
import { riseIn } from "@/utils/motion";

// The whole screen when the app can't get its data (Home, Projects, History): sleepy Deemo, large, filling the top;
// what happened and what to do at the bottom; one Try again button. The screen's own buttons and lists stay hidden,
// since none of them would work. It tells "no internet on the phone" apart from "the DEEMO server is down". A retry
// that fails again makes Deemo shake its head before dozing off again. The tab bar hides while this shows (tab-bar.tsx).
// When the phone gets its connection back, it retries by itself. The small print says why the last call failed.
export function Offline({ onRetry }: { onRetry: () => Promise<unknown> }) {
  const net = useNetInfo();
  const reduced = useReducedMotion();
  const [busy, setBusy] = useState(false);
  const [tries, setTries] = useState(0);
  const noInternet = net.isConnected === false || net.isInternetReachable === false;

  // Deemo stays asleep while the button says "Trying…"; the attempt shows for at least half a second, so a fast
  // failure doesn't flash between poses before the head-shake.
  const retry = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await Promise.all([onRetry(), new Promise((r) => setTimeout(r, 500))]);
    } finally {
      setBusy(false);
      setTries((n) => n + 1); // still here means it failed again
    }
  };

  // Back online (Wi-Fi or data turned on): try again without waiting for a tap. Only the connection changing
  // triggers it; the retry itself is an effect event.
  const retryNow = useEffectEvent(() => void retry());
  // null until NetInfo's first report, so opening this screen while online doesn't count as coming back.
  const online = net.isConnected === null ? null : net.isConnected && net.isInternetReachable !== false;
  const wasOnline = useRef(online);
  useEffect(() => {
    if (online && wasOnline.current === false) retryNow();
    wasOnline.current = online;
  }, [online]);

  const detail = lastApiFailure();

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.art} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Animated.View entering={FadeIn.duration(300)}>
          <Deemo key={tries} size="xl" mood="sleepy" startle={tries > 0} />
        </Animated.View>
      </View>
      <Animated.View entering={riseIn(80, reduced)} style={styles.words} accessibilityLiveRegion="polite">
        <Text accessibilityRole="header" style={styles.title}>
          {noInternet ? "You're offline." : "Can't reach\nDEEMO right now."}
        </Text>
        <Text style={styles.body}>
          {noInternet
            ? "Connect to Wi-Fi or mobile data, then try again. Your sessions are safe on the server."
            : "The server isn't answering. It may be restarting; your sessions are safe. Try again in a moment."}
        </Text>
        <View style={styles.cta}>
          <Button label={busy ? "Trying…" : "Try again"} onPress={retry} busy={busy} />
        </View>
        {detail && !noInternet ? (
          <Text style={styles.detail} numberOfLines={2} selectable>
            Details: {detail}
          </Text>
        ) : null}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper, paddingHorizontal: 22 },
  art: { flex: 1, alignItems: "center", justifyContent: "center" },
  words: { paddingBottom: 24 }, // the tab bar is hidden here
  title: { ...type.hero },
  body: { ...type.body, fontSize: 15, lineHeight: 22, color: colors.inkMuted, marginTop: 10 },
  cta: { marginTop: 24 },
  detail: { ...type.meta, marginTop: 12, textAlign: "center" },
});
