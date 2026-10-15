import { StyleSheet, Text, View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { PremiumBadge } from "@/components/deemo/badge";
import { Icon } from "@/components/icon";
import { colors, fonts, radius } from "@/theme";

const PERKS = ["Every defense stage", "Up to three panelists", "25-minute sessions", "The full report", "A suited-up Deemo"];

// The Premium plan on Profile, made like a member's card: ink stock, a gold hairline edge, light catching the top
// right corner, and Deemo's own medal (the badge the owl wears, with its occasional glint). Gold stays the Premium-only
// color it is everywhere else in the app.
export function PremiumCard() {
  const reduced = useReducedMotion();
  return (
    <View style={styles.card} accessible accessibilityLabel={`Premium plan, demo. ${PERKS.join(", ")}.`}>
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <LinearGradient id="premiumSheen" x1="1" y1="0" x2="0.35" y2="0.9">
            <Stop offset="0" stopColor={colors.goldLight} stopOpacity={0.22} />
            <Stop offset="0.55" stopColor={colors.gold} stopOpacity={0.06} />
            <Stop offset="1" stopColor={colors.gold} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#premiumSheen)" />
      </Svg>

      <View style={styles.head}>
        <Svg width={48} height={60} viewBox="0 0 48 60">
          <PremiumBadge cx={22} cy={27} scale={2} still={reduced} />
        </Svg>
        <View style={styles.flex}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Premium</Text>
            <View style={styles.demo}>
              <Text style={styles.demoText}>Demo</Text>
            </View>
          </View>
          <Text style={styles.sub}>Your panel, at full strength.</Text>
        </View>
      </View>

      <View style={styles.rule} />

      <View style={styles.perks}>
        {PERKS.map((p) => (
          <View key={p} style={styles.perk}>
            <Icon name="check" size={16} color={colors.gold} />
            <Text style={styles.perkText}>{p}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  card: {
    marginTop: 18,
    borderRadius: radius.xl,
    backgroundColor: colors.ink,
    borderWidth: 1,
    borderColor: colors.goldInk,
    overflow: "hidden",
    paddingTop: 14,
    paddingBottom: 18,
    paddingHorizontal: 18,
  },
  head: { flexDirection: "row", alignItems: "center", gap: 10, marginLeft: -6 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontFamily: fonts.display, fontWeight: "800", fontSize: 24, letterSpacing: -0.6, color: colors.goldLight },
  demo: {
    borderWidth: 1,
    borderColor: colors.goldInk,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  demoText: { fontFamily: fonts.body, fontWeight: "600", fontSize: 11, color: colors.gold },
  sub: { fontFamily: fonts.body, fontSize: 13.5, color: colors.sand, opacity: 0.8, marginTop: 2 },
  rule: { height: 1, backgroundColor: colors.goldInk, opacity: 0.6, marginTop: 12, marginBottom: 12 },
  perks: { gap: 8 },
  perk: { flexDirection: "row", alignItems: "center", gap: 10 },
  perkText: { fontFamily: fonts.body, fontWeight: "500", fontSize: 14, color: colors.paper },
});
