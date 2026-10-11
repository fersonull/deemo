import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";

import { colors, easeOut, radius, type } from "@/theme";

type Props = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
  leading?: ReactNode;
};

export function Button({ label, onPress, variant = "primary", disabled, leading }: Props) {
  const primary = variant === "primary";
  // Press feedback: a quick squeeze to 0.97 that eases back on release. Reduce motion dims instead.
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const squeezing = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const to = (v: number, duration: number) => {
    if (!reduced) scale.set(withTiming(v, { duration, easing: easeOut }));
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => to(0.97, 100)}
      onPressOut={() => to(1, 160)}
    >
      {({ pressed }) => (
        <Animated.View
          style={[
            styles.base,
            { backgroundColor: primary ? colors.ink : colors.sand },
            disabled && styles.disabled,
            pressed && reduced && styles.pressed,
            squeezing,
          ]}
        >
          {leading}
          <Text style={[type.button, { color: primary ? colors.paper : colors.ink }]}>{label}</Text>
        </Animated.View>
      )}
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
