import { useState, type ComponentProps, type ReactNode } from "react";
import { Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated from "react-native-reanimated";

import { colors, lit as litStyle } from "@/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Faces dark enough to take only a faint highlight.
const DARK_FACES: (string | undefined)[] = [colors.ink, colors.clay, colors.dusk, colors.duskInk];

type Props = Omit<PressableProps, "style" | "children"> & {
  style?: StyleProp<ViewStyle>;
  lit?: boolean; // Main actions and selectable chips opt in; navigation and links stay plain.
  busy?: boolean;
  entering?: ComponentProps<typeof AnimatedPressable>["entering"]; // e.g. a list's stagger
  children?: ReactNode;
};

// Keep the label and its background on one native view through disabled/enabled state changes.
export function PressableScale({ entering, ...props }: Props) {
  // An entering animation runs on a wrapper, so it never fights the caller's own transform.
  if (!entering) return <Pressed {...props} />;
  return (
    <Animated.View entering={entering}>
      <Pressed {...props} />
    </Animated.View>
  );
}

function Pressed({ style, lit = false, busy, accessibilityState, onPressIn, onPressOut,
  onFocus, onBlur, disabled, children, ...rest }: Omit<Props, "entering">) {
  const [down, setDown] = useState(false);
  const [focused, setFocused] = useState(false);
  const working = !!(busy ?? accessibilityState?.busy);
  const unavailable = !!(disabled || accessibilityState?.disabled);
  const blocked = unavailable || working;
  const inactive = unavailable && !working;
  if (blocked && down) setDown(false);
  const flat = StyleSheet.flatten(style) ?? {};
  const dark = DARK_FACES.includes(flat.backgroundColor as string);
  // Lit like the content cards: a top highlight and a soft glow down the face, all inside the control. Held down,
  // the light goes out, so it reads as pressed in without moving.
  const surface: ViewStyle = lit && !inactive && !(down && !blocked)
    ? { boxShadow: dark
        ? [{ inset: true, offsetX: 0, offsetY: 1, blurRadius: 0, color: "rgba(255,255,255,0.16)" },
          { inset: true, offsetX: 0, offsetY: 12, blurRadius: 20, spreadDistance: -10, color: "rgba(255,255,255,0.08)" }]
        : [...litStyle.boxShadow] }
    : {};
  surface.outlineWidth = focused && !blocked ? 2 : 0;
  surface.outlineOffset = 3;
  surface.outlineColor = colors.dusk;
  return (
    <AnimatedPressable
      {...rest}
      collapsable={false}
      accessibilityState={{ ...accessibilityState, disabled: blocked, busy: working }}
      disabled={blocked}
      focusable={!blocked}
      onPressIn={(e) => {
        if (lit) setDown(true);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        if (lit) setDown(false);
        onPressOut?.(e);
      }}
      onFocus={(e) => { setFocused(true); onFocus?.(e); }}
      onBlur={(e) => { setFocused(false); onBlur?.(e); }}
      style={[style, surface]}
    >
      {children}
    </AnimatedPressable>
  );
}
