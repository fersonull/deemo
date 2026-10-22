import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import { PressableScale } from "@/components/pressable-scale";
import { Sheet } from "@/components/sheet";
import { colors, dark, light, radius, space, type } from "@/theme";
import type { Palette } from "@/colors";
import { chooseTheme, theme, type ThemeName } from "@/utils/theme-choice";

const THEMES: { name: ThemeName; label: string; palette: Palette }[] = [
  { name: "light", label: "Light", palette: light },
  { name: "dark", label: "Dark", palette: dark },
];

// Pick light or dark. Each choice shows a small phone drawn in that theme's own colors, so the student sees what
// they'll get before the app restarts into it.
export function ThemeSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [pick, setPick] = useState<ThemeName>(theme);
  const [switching, setSwitching] = useState(false);
  const label = THEMES.find((t) => t.name === pick)!.label.toLowerCase();

  return (
    <Sheet visible={visible} onClose={() => !switching && onClose()}>
      <Text style={styles.title}>Theme</Text>
      <Text style={styles.body}>The app restarts to switch. You stay signed in.</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel="Theme" style={styles.choices}>
        {THEMES.map((t) => {
          const selected = t.name === pick;
          return (
            <PressableScale
              key={t.name}
              accessibilityRole="radio"
              accessibilityLabel={`${t.label} theme`}
              accessibilityState={{ checked: selected }}
              onPress={() => setPick(t.name)}
              style={[styles.choice, selected && styles.choiceOn]}
            >
              <Preview palette={t.palette} />
              <View style={styles.choiceLabel}>
                <Text style={styles.choiceText}>{t.label}</Text>
                {selected ? <Icon name="check_circle" size={18} color={colors.dusk} filled /> : null}
              </View>
            </PressableScale>
          );
        })}
      </View>
      <View style={styles.cta}>
        <Button
          label={pick === theme ? "Current theme" : `Use the ${label} theme`}
          disabled={pick === theme}
          busy={switching}
          onPress={() => {
            setSwitching(true);
            void chooseTheme(pick).finally(() => setSwitching(false));
          }}
        />
      </View>
    </Sheet>
  );
}

// A miniature Home in the given palette: the title, Deemo's note, a session card, the main button and the tab bar.
function Preview({ palette: p }: { palette: Palette }) {
  return (
    <View style={[styles.phone, { backgroundColor: p.paper, borderColor: p.border }]} importantForAccessibility="no-hide-descendants">
      <View style={[styles.line, { width: "55%", height: 7, backgroundColor: p.ink }]} />
      <View style={[styles.card, { backgroundColor: p.sand }]}>
        <View style={[styles.line, { width: "70%", backgroundColor: p.inkMuted }]} />
        <View style={[styles.line, { width: "45%", backgroundColor: p.muted }]} />
      </View>
      <View style={[styles.card, styles.row, { backgroundColor: p.sand }]}>
        <View style={[styles.chip, { backgroundColor: p.duskTint }]}>
          <View style={[styles.line, { width: 14, backgroundColor: p.duskInk }]} />
        </View>
        <View style={[styles.score, { backgroundColor: p.dusk }]} />
      </View>
      <View style={[styles.button, { backgroundColor: p.fill }]}>
        <View style={[styles.line, { width: "40%", backgroundColor: p.onFill }]} />
      </View>
      <View style={[styles.tabs, { backgroundColor: p.fill }]}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[styles.dot, { backgroundColor: i === 0 ? p.onFill : p.onFillDim }]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { ...type.title, fontSize: 26, lineHeight: 28, letterSpacing: -0.8 },
  body: { ...type.body, color: colors.inkMuted, marginTop: space.sm },
  choices: { flexDirection: "row", gap: space.md, marginTop: space.lg },
  choice: { flex: 1, borderRadius: radius.xl, padding: space.sm, borderWidth: 2, borderColor: "transparent", gap: space.sm },
  choiceOn: { borderColor: colors.dusk },
  choiceLabel: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.xs, minHeight: 24 },
  choiceText: { ...type.bodyStrong, color: colors.ink },
  phone: { aspectRatio: 0.62, borderRadius: 16, borderWidth: 1, padding: 10, gap: 7 },
  line: { height: 5, borderRadius: 3 },
  card: { borderRadius: 8, padding: 7, gap: 5 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  chip: { borderRadius: 6, paddingVertical: 4, paddingHorizontal: 6 },
  score: { width: 16, height: 16, borderRadius: 8 },
  button: { height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center", marginTop: "auto" },
  tabs: { height: 16, borderRadius: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-around" },
  dot: { width: 5, height: 5, borderRadius: 3 },
  cta: { marginTop: space.xl },
});
