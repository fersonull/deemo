import { StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/icon";
import { Sheet } from "@/components/sheet";
import { IT_FIELDS, type Domain } from "@/constants";
import { colors, radius, type } from "@/theme";
import { PressableScale } from "@/components/pressable-scale";

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
      <Text style={styles.title}>IT field</Text>
      <Text style={styles.subtitle}>The panel tunes its technical questions to this.</Text>
      <View accessibilityRole="radiogroup" style={styles.domains}>
        {IT_FIELDS.map((d) => {
          const selected = d === value;
          return (
            <PressableScale
              key={d}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              onPress={() => onPick(d)}
              style={[styles.domain, selected && styles.domainSelected]}
            >
              <Text style={[styles.domainText, selected && styles.onInk]}>{d}</Text>
              {selected && <Icon name="check" size={20} color={colors.paper} />}
            </PressableScale>
          );
        })}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  title: { ...type.title, fontSize: 26, lineHeight: 28, letterSpacing: -0.8 },
  subtitle: { ...type.body, fontSize: 13.5, lineHeight: 20, color: colors.inkMuted, marginTop: 8 },
  domains: { gap: 8, marginTop: 16 },
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
