import { useId, type ReactNode } from "react";
import { StyleSheet, Text } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { PressableScale } from "@/components/pressable-scale";
import { colors, radius, type } from "@/theme";

type Props = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "premium"; // premium: the gold-on-ink of the Premium card, for Try Premium only
  disabled?: boolean;
  busy?: boolean; // working on it: stays put, reads as busy
  leading?: ReactNode;
};

export function Button({ label, onPress, variant = "primary", disabled, busy, leading }: Props) {
  const sheen = `sheen${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const bg = variant === "secondary" ? colors.sand : colors.ink;
  const inactive = disabled && !busy;
  const fg = inactive ? colors.inkMuted : variant === "secondary" ? colors.ink : variant === "premium" ? colors.goldLight : colors.paper;
  const depth = variant === "secondary" ? colors.sandDepth : variant === "premium" ? colors.goldInk : colors.inkDepth;
  return (
    <PressableScale
      accessibilityRole="button"
      busy={busy}
      disabled={disabled}
      onPress={onPress}
      depthColor={depth}
      style={[styles.base, { backgroundColor: inactive ? colors.sand : bg }, variant === "premium" && !inactive && styles.premium]}
    >
      {variant === "premium" && !inactive ? (
        // Light catching the top right, as on the Premium card.
        <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <LinearGradient id={sheen} x1="1" y1="0" x2="0.2" y2="1">
              <Stop offset="0" stopColor={colors.goldLight} stopOpacity={0.3} />
              <Stop offset="0.6" stopColor={colors.gold} stopOpacity={0.06} />
              <Stop offset="1" stopColor={colors.gold} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#${sheen})`} />
        </Svg>
      ) : null}
      {!busy ? leading : null}
      <Text key={`${fg}:${label}`} accessibilityLiveRegion="polite" style={[type.button, { color: fg }]}>{label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 58,
    borderRadius: radius.pill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  premium: { borderWidth: 1, borderColor: colors.goldInk, overflow: "hidden" },
});
