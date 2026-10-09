import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import { Screen } from "@/components/screen";
import { MODE_LABELS, type Mode } from "@/constants";
import { practiceSetup, usePracticeSetup } from "@/hooks/use-practice-setup";
import { session, useSession } from "@/hooks/use-session";
import { colors, radius, type } from "@/theme";

import { Segmented } from "./segmented";
import { DomainSheet, UpsellSheet } from "./sheets";

const MODES: { value: Mode; desc: string }[] = [
  { value: "TITLE", desc: "Problem, objectives, feasibility · 8–10 min" },
  { value: "PRE_ORAL", desc: "Methodology, design, progress · 12–15 min" },
  { value: "FINAL", desc: "Results, testing, conclusions · 15–20 min" },
];

const FEEDBACK = [
  { coach: true, label: "Coach", desc: "Gentle hints as you go" },
  { coach: false, label: "Panel", desc: "Realistic. No hints at all" },
];

// Free tier (addendum Q1): Title + Pre-Oral, 1 panelist, 10 min. Locked choices open the upsell.
export function Setup() {
  const setup = usePracticeSetup();
  const { premium } = useSession();
  const [sheet, setSheet] = useState<"domain" | "upsell" | null>(null);
  const upsell = () => setSheet("upsell");

  return (
    <Screen scroll onBack={() => router.back()} title={"Which defense\ntoday?"}>
      <Pressable accessibilityRole="button" accessibilityHint="Change domain" onPress={() => setSheet("domain")} style={styles.domain}>
        <Icon name="category" size={16} color={colors.duskIcon} />
        <Text style={styles.domainText}>
          Domain: <Text style={styles.domainValue}>{setup.domain}</Text>
        </Text>
        <View style={styles.change}>
          <Text style={styles.changeText}>Change</Text>
        </View>
      </Pressable>

      <View accessibilityRole="radiogroup" accessibilityLabel="Defense stage" style={styles.modes}>
        {MODES.map((m) => {
          const locked = m.value === "FINAL" && !premium;
          const selected = setup.mode === m.value;
          const fg = selected ? colors.paper : colors.ink;
          return (
            <Pressable
              key={m.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityHint={locked ? "Premium" : undefined}
              onPress={() => (locked ? upsell() : practiceSetup.set({ mode: m.value }))}
              style={[styles.mode, selected && styles.inkCard]}
            >
              <View style={styles.flex}>
                <Text style={[type.heading, { color: fg }]}>{MODE_LABELS[m.value]}</Text>
                <Text style={[styles.desc, { color: fg }]}>{m.desc}</Text>
              </View>
              <Icon name={locked ? "lock" : selected ? "radio_button_checked" : "radio_button_unchecked"} color={fg} />
            </Pressable>
          );
        })}
      </View>

      <Text style={[type.label, styles.section]}>PANELISTS</Text>
      <Segmented
        label="Panelists"
        value={setup.panelists}
        onChange={(panelists) => practiceSetup.set({ panelists })}
        onLocked={upsell}
        options={[1, 2, 3].map((n) => ({ value: n, label: String(n), locked: n > 1 && !premium }))}
      />

      <Text style={[type.label, styles.section]}>LENGTH</Text>
      <Segmented
        label="Length"
        value={setup.minutes}
        onChange={(minutes) => practiceSetup.set({ minutes })}
        onLocked={upsell}
        options={[10, 15, 25].map((n) => ({ value: n, label: `${n} min`, locked: n > 10 && !premium }))}
      />

      <Text style={[type.label, styles.section]}>FEEDBACK</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel="Feedback" style={styles.feedback}>
        {FEEDBACK.map((f) => {
          const selected = setup.coach === f.coach;
          const fg = selected ? colors.paper : colors.ink;
          return (
            <Pressable
              key={f.label}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              onPress={() => practiceSetup.set({ coach: f.coach })}
              style={[styles.fbCard, selected && styles.inkCard]}
            >
              <Text style={[type.heading, styles.fbLabel, { color: fg }]}>{f.label}</Text>
              <Text style={[styles.desc, styles.fbDesc, { color: fg }]}>{f.desc}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.cta}>
        <Button label="Continue to mic check" onPress={() => router.push("/mic-check")} />
      </View>

      <DomainSheet
        visible={sheet === "domain"}
        value={setup.domain}
        onClose={() => setSheet(null)}
        onPick={(domain) => {
          practiceSetup.set({ domain });
          setSheet(null);
        }}
      />
      <UpsellSheet
        visible={sheet === "upsell"}
        onClose={() => setSheet(null)}
        onUpgrade={() => {
          session.upgrade();
          setSheet(null);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  domain: {
    alignSelf: "flex-start",
    marginTop: 12,
    minHeight: 36,
    borderRadius: 18,
    backgroundColor: colors.sand,
    paddingLeft: 12,
    paddingRight: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  domainText: { ...type.body, fontSize: 12.5, fontWeight: "500" },
  domainValue: { fontWeight: "600" },
  change: { height: 26, borderRadius: 13, backgroundColor: colors.paper, paddingHorizontal: 10, justifyContent: "center" },
  changeText: { ...type.meta, fontWeight: "600", color: colors.ink },
  modes: { gap: 8, marginTop: 18 },
  mode: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radius.xl,
    backgroundColor: colors.sand,
  },
  inkCard: { backgroundColor: colors.ink },
  desc: { ...type.body, fontSize: 12.5, lineHeight: 17.5, opacity: 0.75, marginTop: 2 },
  section: { marginTop: 20, marginBottom: 8 },
  feedback: { flexDirection: "row", gap: 8 },
  fbCard: { flex: 1, paddingVertical: 12, paddingHorizontal: 14, borderRadius: radius.lg, backgroundColor: colors.sand },
  fbLabel: { fontSize: 15 },
  fbDesc: { fontSize: 12, lineHeight: 16, marginTop: 3 },
  cta: { marginTop: 20 },
});
