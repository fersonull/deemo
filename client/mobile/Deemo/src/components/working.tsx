import { useEffect, useState, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Deemo } from "@/components/deemo";
import { Icon } from "@/components/icon";
import { colors, fonts, type } from "@/theme";

export type Step = readonly [label: string, at: number]; // lights up when progress reaches `at` (0–100)

type Props = {
  title: string;
  subtitle: string;
  since: number; // ms timestamp the work started
  expectedMs: number;
  steps?: readonly Step[]; // hidden once something went wrong
  children?: ReactNode; // e.g. session stats, under the subtitle
};

// A wait the server is working through (reading a manuscript, scoring a session): Deemo reading,
// steps that light up, and a progress bar. Progress is an estimate; the server only says "not yet".
export function Working({ title, subtitle, since, expectedMs, steps, children }: Props) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 400);
    return () => clearInterval(t);
  }, []);
  const pct = Math.min(95, Math.max(3, ((now - since) / expectedMs) * 100));

  return (
    <View style={styles.wrap} accessibilityLiveRegion="polite">
      <View style={styles.art}>
        <Deemo mood="reading" />
      </View>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <Text style={styles.sub}>{subtitle}</Text>
      {children}
      {steps ? (
        <View style={styles.steps}>
          {steps.map(([label, at]) => {
            const done = pct >= at;
            return (
              <View key={label} style={[styles.step, { opacity: pct >= at - 15 ? 1 : 0.35 }]}>
                <Icon
                  name={done ? "check_circle" : "radio_button_unchecked"}
                  size={20}
                  color={done ? colors.sage : colors.muted}
                />
                <Text style={styles.stepText}>{label}</Text>
              </View>
            );
          })}
        </View>
      ) : null}
      <View style={styles.flex} />
      {steps ? (
        <View
          style={styles.track}
          accessible
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}
        >
          <View style={[styles.bar, { width: `${pct}%` }]} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingTop: 6 },
  flex: { flex: 1 },
  art: { height: 140, justifyContent: "center" },
  title: { ...type.title, marginTop: 12 },
  sub: { ...type.body, color: colors.inkMuted, marginTop: 8 },
  steps: { gap: 12, marginTop: 24 },
  step: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepText: { fontFamily: fonts.body, fontWeight: "500", fontSize: 14.5, color: colors.ink },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.sand, overflow: "hidden", marginBottom: 8 },
  bar: { height: "100%", borderRadius: 4, backgroundColor: colors.dusk },
});
