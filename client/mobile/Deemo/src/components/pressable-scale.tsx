import { useState, type ComponentProps, type ReactNode } from "react";
import { Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated from "react-native-reanimated";

import { colors, light } from "@/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// How light a face is (0 black … 1 white), from its #rrggbb color; anything else counts as light.
function lightness(color: unknown) {
  const m = typeof color === "string" ? /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color) : null;
  if (!m) return 1;
  const [r, g, b] = m.slice(1).map((h) => parseInt(h, 16) / 255);
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}
const nightTheme = lightness(colors.paper) < 0.3;

type Props = Omit<PressableProps, "style" | "children"> & {
  style?: StyleProp<ViewStyle>;
  lit?: boolean; // Main actions and selectable chips opt in; navigation and links stay plain.
  glint?: string; // #rrggbb: the color of the light on a dark face (Premium's gold); white by default
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

function Pressed({ style, lit = false, glint, busy, accessibilityState, onPressIn, onPressOut,
  onFocus, onBlur, disabled, children, ...rest }: Omit<Props, "entering">) {
  const [down, setDown] = useState(false);
  const [focused, setFocused] = useState(false);
  const working = !!(busy ?? accessibilityState?.busy);
  const unavailable = !!(disabled || accessibilityState?.disabled);
  const blocked = unavailable || working;
  const inactive = unavailable && !working;
  if (blocked && down) setDown(false);
  const flat = StyleSheet.flatten(style) ?? {};
  const dark = lightness(flat.backgroundColor) < 0.45;
  // Lit like the content cards: a top highlight and a soft glow down the face, all inside the control. Held down,
  // the light goes out, so it reads as pressed in without moving.
  const surface: ViewStyle = lit && !inactive && !(down && !blocked)
    ? { boxShadow: dark
        // Dark faces take a soft light (a touch stronger on light paper, where ink needs more to read as lit).
        ? [{ inset: true, offsetX: 0, offsetY: 1, blurRadius: 0, color: glint ? `${glint}8C` : nightTheme ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.22)" },
          { inset: true, offsetX: 0, offsetY: 12, blurRadius: 20, spreadDistance: -10, color: glint ? `${glint}29` : nightTheme ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.1)" }]
        // Light faces catch the light theme's full highlight, in either theme.
        : [{ inset: true, offsetX: 0, offsetY: 1, blurRadius: 0, color: light.highlight },
          { inset: true, offsetX: 0, offsetY: 14, blurRadius: 22, spreadDistance: -12, color: light.glow }] }
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
