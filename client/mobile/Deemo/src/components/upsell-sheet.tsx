import { Pressable, StyleSheet, Text, View } from "react-native";

import { Deemo } from "@/components/deemo";
import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import { Sheet } from "@/components/sheet";
import { colors, type } from "@/theme";

const PERKS = [
  "Deemo suits up, with a shining gold pin",
  "Final Defense mode",
  "Up to 3 panelists at once",
  "More than one manuscript",
  "Rubric breakdown and delivery stats",
  "Stronger sample answers",
  "PDF report for your adviser",
];

// Premium upsell (addendum Q1), opened by any locked choice.
export function UpsellSheet({ visible, onClose, onUpgrade }: { visible: boolean; onClose: () => void; onUpgrade: () => void }) {
  return (
    <Sheet visible={visible} onClose={onClose}>
      {/* A preview of Premium Deemo: suited up, pin shining */}
      <View style={styles.head}>
        <Deemo size="m" mood="cheering" suited />
        <View style={styles.flex}>
          <Text style={styles.title}>Rehearse the whole defense</Text>
          <Text style={styles.sub}>And Deemo dresses for it.</Text>
        </View>
      </View>
      <View style={styles.perks}>
        {PERKS.map((p) => (
          <View key={p} style={styles.perk}>
            {/* Deemo's perk wears the gold of the pin; the rest are plain checks */}
            {p === PERKS[0] ? (
              <Icon name="workspace_premium" size={19} color={colors.gold} filled />
            ) : (
              <Icon name="check_circle" size={19} color={colors.duskIcon} />
            )}
            <Text style={type.body}>{p}</Text>
          </View>
        ))}
      </View>
      <View style={styles.upgrade}>
        {/* ponytail: mock upgrade, no payments (addendum Q1). */}
        <Button label="Try Premium (demo)" onPress={onUpgrade} />
      </View>
      <Pressable accessibilityRole="button" onPress={onClose} style={styles.notNow}>
        <Text style={[type.body, styles.notNowText]}>Not now</Text>
      </Pressable>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: 14 },
  flex: { flex: 1, minWidth: 0 },
  title: { ...type.title, fontSize: 24, lineHeight: 26, letterSpacing: -0.8 },
  sub: { ...type.body, fontSize: 13.5, color: colors.inkMuted, marginTop: 4 },
  perks: { gap: 10, marginTop: 16 },
  perk: { flexDirection: "row", alignItems: "center", gap: 12 },
  upgrade: { marginTop: 20 },
  notNow: { height: 48, alignItems: "center", justifyContent: "center", marginTop: 4 },
  notNowText: { fontWeight: "500", color: colors.inkMuted },
});
