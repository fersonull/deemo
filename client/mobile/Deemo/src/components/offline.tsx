import { useNetInfo } from "@react-native-community/netinfo";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/button";
import { Deemo } from "@/components/deemo";
import { colors, type } from "@/theme";
import { riseIn } from "@/utils/motion";

// The whole screen when the app can't get its data (Home, Projects, History): sleepy Deemo, large, filling the top;
// what happened and what to do at the bottom; one Try again button. The screen's own buttons and lists stay hidden,
// since none of them would work. It tells "no internet on the phone" apart from "the DEEMO server is down". A retry
// that fails again makes Deemo shake its head before dozing off again.
export function Offline({ onRetry }: { onRetry: () => Promise<unknown> }) {
  const net = useNetInfo();
  const reduced = useReducedMotion();
  const [busy, setBusy] = useState(false);
  const [tries, setTries] = useState(0);
  const noInternet = net.isConnected === false || net.isInternetReachable === false;

  const retry = async () => {
    setBusy(true);
    try {
      await onRetry();
    } finally {
      setBusy(false);
      setTries((n) => n + 1); // still here means it failed again
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.art} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Animated.View entering={FadeIn.duration(300)}>
          <Deemo key={tries} size="xl" mood={busy ? "reading" : "sleepy"} startle={tries > 0 && !busy} />
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
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper, paddingHorizontal: 22 },
  art: { flex: 1, alignItems: "center", justifyContent: "center" },
  words: { paddingBottom: 120 }, // clears the floating tab bar
  title: { ...type.hero },
  body: { ...type.body, fontSize: 15, lineHeight: 22, color: colors.inkMuted, marginTop: 10 },
  cta: { marginTop: 24 },
});
