import { useEffect, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";

import { colors, easeOut, radius } from "@/theme";

type Props = Omit<PressableProps, "style" | "children"> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  faceStyle: StyleProp<ViewStyle>;
  depthColor: string;
  busy?: boolean;
};

// Only action buttons opt in; navigation, tabs and rows keep their own press feedback.
export function PressableDepth({ children, style, faceStyle, depthColor, disabled, busy, accessibilityState,
  onPressIn, onPressOut, onFocus, onBlur, onHoverIn, onHoverOut, ...props }: Props) {
  const reduced = useReducedMotion();
  const pressed = useSharedValue(0);
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const blocked = !!(disabled || busy);
  const inactive = !!disabled && !busy;
  useEffect(() => {
    if (blocked) pressed.set(0);
  }, [blocked, pressed]);
  const feedback = useAnimatedStyle(() => ({
    transform: [{ translateX: blocked ? 0 : pressed.value }, { translateY: blocked ? 0 : pressed.value * 3 }],
  }));

  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      accessibilityState={{ ...accessibilityState, disabled: blocked, busy: !!busy }}
      disabled={blocked}
      focusable={!blocked}
      onPressIn={(e) => {
        pressed.set(withTiming(1, { duration: reduced ? 0 : 100, easing: easeOut }));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        pressed.set(withTiming(0, { duration: reduced ? 0 : 160, easing: easeOut }));
        onPressOut?.(e);
      }}
      onFocus={(e) => { setFocused(true); onFocus?.(e); }}
      onBlur={(e) => { setFocused(false); onBlur?.(e); }}
      onHoverIn={(e) => { setHovered(true); onHoverIn?.(e); }}
      onHoverOut={(e) => { setHovered(false); onHoverOut?.(e); }}
      style={[styles.base, style, { backgroundColor: inactive ? colors.sand : depthColor }]}
    >
      {focused && !blocked ? <View pointerEvents="none" style={styles.focus} /> : null}
      <Animated.View
        pointerEvents="none"
        style={[styles.face, faceStyle, hovered && !blocked && styles.hovered, inactive && styles.inactive, feedback]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { height: 58, borderRadius: radius.pill },
  face: { position: "absolute", top: 0, left: 0, right: 1, bottom: 4, borderRadius: radius.pill, overflow: "hidden" },
  hovered: { top: -1 },
  inactive: { right: 0, bottom: 0, backgroundColor: colors.sand, borderWidth: 0 },
  focus: { position: "absolute", top: -4, bottom: -4, left: -4, right: -4, borderRadius: radius.pill + 4, borderWidth: 2, borderColor: colors.dusk },
});
