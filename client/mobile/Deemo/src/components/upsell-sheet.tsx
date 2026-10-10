import { Pressable, StyleSheet, Text, View } from "react-native";

import { Blob } from "@/components/blob";
import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import { Sheet } from "@/components/sheet";
import { colors, type } from "@/theme";

const PERKS = [
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
      <Blob width={62} height={54}>
        <Icon name="workspace_premium" size={26} color={colors.paper} filled />
      </Blob>
      <Text style={styles.title}>Rehearse the whole defense</Text>
      <View style={styles.perks}>
        {PERKS.map((p) => (
          <View key={p} style={styles.perk}>
            <Icon name="check_circle" size={19} color={colors.duskIcon} />
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
  title: { ...type.title, fontSize: 26, lineHeight: 28, letterSpacing: -0.8, marginTop: 14 },
  perks: { gap: 10, marginTop: 16 },
  perk: { flexDirection: "row", alignItems: "center", gap: 12 },
  upgrade: { marginTop: 20 },
  notNow: { height: 48, alignItems: "center", justifyContent: "center", marginTop: 4 },
  notNowText: { fontWeight: "500", color: colors.inkMuted },
});
