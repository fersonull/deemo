import { useEffect, useState, type ComponentProps, type ReactNode } from "react";
import { Platform, Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";

import { colors, easeOut, radius } from "@/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, "style" | "children"> & {
  style?: StyleProp<ViewStyle>;
  depthColor?: string;
  layered?: boolean; // Main actions opt in; navigation, cards and links stay flat.
  busy?: boolean;
  entering?: ComponentProps<typeof AnimatedPressable>["entering"]; // e.g. a list's stagger
  children?: ReactNode;
};

// Keep the label and its background on one native view through disabled/enabled state changes.
export function PressableScale({ entering, ...props }: Props) {
  // An entering animation runs on a wrapper: on the Pressable itself it would fight the press transform.
  if (!entering) return <Pressed {...props} />;
  return (
    <Animated.View entering={entering}>
      <Pressed {...props} />
    </Animated.View>
  );
}

function Pressed({ style, depthColor, layered = false, busy, accessibilityState, onPressIn, onPressOut,
  onFocus, onBlur, onHoverIn, onHoverOut, disabled, children, ...rest }: Omit<Props, "entering">) {
  const reduced = useReducedMotion();
  const pressed = useSharedValue(0);
  const [down, setDown] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const working = !!(busy ?? accessibilityState?.busy);
  const unavailable = !!(disabled || accessibilityState?.disabled);
  const blocked = unavailable || working;
  const inactive = unavailable && !working;
  const depressed = down && !blocked;
  if (blocked && down) setDown(false);
  const flat = StyleSheet.flatten(style) ?? {};
  const transform = flat.transform;
  const depth = depthColor ?? (flat.backgroundColor === colors.ink || flat.backgroundColor === colors.clay
    ? colors.inkDepth : flat.backgroundColor === colors.dusk ? colors.duskInk : colors.sandDepth);
  useEffect(() => {
    if (blocked) pressed.set(0);
  }, [blocked, pressed]);
  const feedback = useAnimatedStyle(() => ({
    transform: !layered || typeof transform === "string" ? transform ?? [] : [...(transform ?? []),
      { translateX: blocked ? 0 : pressed.value }, { translateY: blocked ? 0 : pressed.value * 3 }],
    opacity: flat.opacity ?? 1,
  }));
  const surface: ViewStyle = layered ? {
    backgroundColor: flat.backgroundColor ?? colors.paper,
    borderRadius: flat.borderRadius ?? radius.md,
    marginBottom: flat.marginBottom ?? 4,
    boxShadow: inactive ? [] : [{ offsetX: depressed ? 0 : 1, offsetY: depressed ? 1 : hovered && !blocked ? 5 : 4, blurRadius: 0, color: depth }],
  } : {};
  surface.outlineWidth = focused && !blocked ? 2 : 0;
  surface.outlineOffset = 3;
  surface.outlineColor = colors.dusk;
  // shortcut: Android 7–8 has no boxShadow; use platform elevation until the minimum is Android 9+.
  if (layered && Platform.OS === "android" && Number(Platform.Version) < 28) surface.elevation = inactive ? 0 : depressed ? 1 : 3;
  return (
    <AnimatedPressable
      {...rest}
      collapsable={false}
      accessibilityState={{ ...accessibilityState, disabled: blocked, busy: working }}
      disabled={blocked}
      focusable={!blocked}
      onPressIn={(e) => {
        if (layered) {
          setDown(true);
          pressed.set(withTiming(1, { duration: reduced ? 0 : 100, easing: easeOut }));
        }
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        if (layered) {
          setDown(false);
          pressed.set(withTiming(0, { duration: reduced ? 0 : 160, easing: easeOut }));
        }
        onPressOut?.(e);
      }}
      onFocus={(e) => { setFocused(true); onFocus?.(e); }}
      onBlur={(e) => { setFocused(false); onBlur?.(e); }}
      onHoverIn={(e) => { setHovered(true); onHoverIn?.(e); }}
      onHoverOut={(e) => { setHovered(false); onHoverOut?.(e); }}
      style={[style, surface, feedback]}
    >
      {children}
    </AnimatedPressable>
  );
}
