import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import { PremiumCard } from "@/components/premium-card";
import { Screen } from "@/components/screen";
import { session, useSession } from "@/hooks/use-session";
import { colors, radius, type } from "@/theme";

// What Premium adds, each against the Free plan (server/src/modules/identity/domain/plan.ts).
const BENEFITS = [
  { icon: "all_inclusive", title: "Unlimited practice", detail: "Practice as often as you like. Free: five sessions a day." },
  { icon: "school", title: "Every defense stage", detail: "Final Defense mode on top of Title and Pre-Oral." },
  { icon: "groups", title: "Up to three panelists", detail: "Each questions in turn, in their own voice. Free: one." },
  { icon: "timer", title: "Sessions up to 60 minutes", detail: "Room for a full defense with every panelist. Free: up to 30 minutes." },
  { icon: "description", title: "More than one manuscript", detail: "Keep every project you're working on. Free: one." },
  { icon: "analytics", title: "The full report", detail: "Rubric breakdown, delivery stats, stronger sample answers and a PDF for your adviser." },
  { icon: "workspace_premium", title: "A suited-up Deemo", detail: "With a shining gold pin." },
];

// Premium benefits (from the compact card on Profile). Free accounts reaching it can try the demo upgrade.
export function Premium() {
  const { premium } = useSession();
  return (
    <Screen scroll onBack={() => router.back()} title="Premium">
      <View style={styles.hero}>
        <PremiumCard />
      </View>

      <Text style={[type.label, styles.section]}>WHAT YOU GET</Text>
      <View style={styles.list}>
        {BENEFITS.map((b, i) => (
          <View key={b.title} style={[styles.item, i > 0 && styles.divider]}>
            <View style={styles.tile}>
              <Icon name={b.icon} size={20} color={b.icon === "workspace_premium" ? colors.gold : colors.duskIcon} filled={b.icon === "workspace_premium"} />
            </View>
            <View style={styles.flex}>
              <Text style={type.bodyStrong}>{b.title}</Text>
              <Text style={styles.detail}>{b.detail}</Text>
            </View>
          </View>
        ))}
      </View>

      <Text style={styles.note}>
        {premium ? "Premium is a demo in DEEMO: no payment was taken and nothing renews." : "Premium is a demo in DEEMO: no payment is taken."}
      </Text>
      {premium ? null : (
        <View style={styles.cta}>
          <Button
            variant="premium"
            label="Try Premium (demo)"
            onPress={() => void session.upgrade()}
            leading={<Icon name="workspace_premium" size={22} color={colors.gold} filled />}
          />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  hero: { marginTop: 8 },
  section: { marginTop: 24, marginBottom: 8, paddingHorizontal: 4 },
  list: { backgroundColor: colors.sand, borderRadius: radius.xl, paddingHorizontal: 14 },
  item: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  tile: { width: 38, height: 38, borderRadius: radius.md, backgroundColor: colors.paper, alignItems: "center", justifyContent: "center" },
  detail: { ...type.meta, lineHeight: 17, marginTop: 2 },
  note: { ...type.meta, lineHeight: 17, marginTop: 12, paddingHorizontal: 4 },
  cta: { marginTop: 16 },
});
