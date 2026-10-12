import type { ReactNode } from "react";
import { StyleSheet, Text } from "react-native";

import { PressableScale } from "@/components/pressable-scale";
import { colors, radius, type } from "@/theme";

type Props = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
  busy?: boolean; // working on it: stays put, reads as busy
  leading?: ReactNode;
};

export function Button({ label, onPress, variant = "primary", disabled, busy, leading }: Props) {
  const primary = variant === "primary";
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ disabled, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={[styles.base, { backgroundColor: primary ? colors.ink : colors.sand }, disabled && !busy && styles.disabled]}
    >
      {leading}
      <Text style={[type.button, { color: primary ? colors.paper : colors.ink }]}>{label}</Text>
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
  disabled: { opacity: 0.35 },
});
