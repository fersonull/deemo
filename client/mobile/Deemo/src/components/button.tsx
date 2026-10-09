import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import { colors, radius, type } from "@/theme";

type Props = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
  leading?: ReactNode;
};

export function Button({ label, onPress, variant = "primary", disabled, leading }: Props) {
  const primary = variant === "primary";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: primary ? colors.ink : colors.sand },
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {leading}
      <Text style={[type.button, { color: primary ? colors.paper : colors.ink }]}>{label}</Text>
    </Pressable>
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
  pressed: { opacity: 0.85 },
});
