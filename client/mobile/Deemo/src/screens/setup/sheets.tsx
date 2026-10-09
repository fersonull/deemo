import { Pressable, StyleSheet, Text, View } from "react-native";

import { Blob } from "@/components/blob";
import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import { Sheet } from "@/components/sheet";
import { DOMAINS, type Domain } from "@/constants";
import { colors, radius, type } from "@/theme";

const PERKS = [
  "Final Defense mode",
  "Up to 3 panelists at once",
  "Rubric breakdown and delivery stats",
  "Stronger sample answers",
  "PDF report for your adviser",
];

export function UpsellSheet({ visible, onClose, onUpgrade }: { visible: boolean; onClose: () => void; onUpgrade: () => void }) {
  return (
    <Sheet visible={visible} onClose={onClose}>
      <Blob width={62} height={54}>
        <Icon name="workspace_premium" size={26} color={colors.paper} filled />
      </Blob>
      <Text style={[styles.title, styles.upsellTitle]}>Rehearse the whole defense</Text>
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

export function DomainSheet({
  visible,
  value,
  onClose,
  onPick,
}: {
  visible: boolean;
  value: Domain;
  onClose: () => void;
  onPick: (d: Domain) => void;
}) {
  return (
    <Sheet visible={visible} onClose={onClose}>
      <Text style={styles.title}>Project domain</Text>
      <Text style={styles.subtitle}>The panel tunes its technical questions to this.</Text>
      <View accessibilityRole="radiogroup" style={styles.domains}>
        {DOMAINS.map((d) => {
          const selected = d === value;
          return (
            <Pressable
              key={d}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              onPress={() => onPick(d)}
              style={[styles.domain, selected && styles.domainSelected]}
            >
              <Text style={[styles.domainText, selected && styles.onInk]}>{d}</Text>
              {selected && <Icon name="check" size={20} color={colors.paper} />}
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  title: { ...type.title, fontSize: 26, lineHeight: 28, letterSpacing: -0.8 },
  upsellTitle: { marginTop: 14 },
  subtitle: { ...type.body, fontSize: 13.5, lineHeight: 20, color: colors.inkMuted, marginTop: 8 },
  perks: { gap: 10, marginTop: 16 },
  perk: { flexDirection: "row", alignItems: "center", gap: 12 },
  upgrade: { marginTop: 20 },
  notNow: { height: 48, alignItems: "center", justifyContent: "center", marginTop: 4 },
  notNowText: { fontWeight: "500", color: colors.inkMuted },
  domains: { gap: 6, marginTop: 14 },
  domain: {
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.sand,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  domainSelected: { backgroundColor: colors.ink },
  domainText: { ...type.bodyStrong },
  onInk: { color: colors.paper },
});
