import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState, type ComponentProps, type ReactNode } from "react";
import { Platform, Pressable, StyleSheet, type BoxShadowValue, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from "react-native-reanimated";

import { colors, easeOut, radius } from "@/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Faces dark enough to take a faint highlight (light faces get a stronger one).
const DARK_FACES: (string | undefined)[] = [colors.ink, colors.clay, colors.dusk, colors.duskInk];
// The ambient shadow's tint: a dusk face throws a dusk shadow, everything else warm ink.
const shade = (face: unknown, a: number) => (face === colors.dusk ? `rgba(52,57,150,${a})` : `rgba(42,36,32,${a})`);

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
  const face = flat.backgroundColor;
  const depth = depthColor ?? (face === colors.ink || face === colors.clay
    ? colors.inkDepth : face === colors.dusk ? colors.duskInk : colors.sandDepth);
  // Controls have a set height (buttons, chips); cards size to their content and stay as they were: no ambient
  // shadow, no sheen. Depth follows size: big actions sit higher than chips.
  const height = typeof flat.height === "number" ? flat.height : typeof flat.minHeight === "number" ? flat.minHeight : undefined;
  const control = height !== undefined;
  const lip = height === undefined ? 4 : height >= 52 ? 5 : height < 40 ? 3 : 4;
  const dark = DARK_FACES.includes(face as string);
  useEffect(() => {
    if (blocked) pressed.set(0);
  }, [blocked, pressed]);
  const feedback = useAnimatedStyle(() => ({
    transform: !layered || typeof transform === "string" ? transform ?? [] : [...(transform ?? []),
      { translateY: blocked ? 0 : pressed.value * (lip - 1) }],
    opacity: flat.opacity ?? 1,
  }));
  const surface: ViewStyle = layered ? {
    backgroundColor: flat.backgroundColor ?? colors.paper,
    borderRadius: flat.borderRadius ?? radius.md,
    marginBottom: flat.marginBottom ?? 4,
    boxShadow: inactive ? [] : shadows(),
  } : {};
  // Lit from above: a 1 px highlight along the top edge, the solid lower layer straight down, and (controls only) a
  // soft warm shadow that grounds it on the paper. Pressed, the face sinks onto the layer and the shadow tightens.
  function shadows(): BoxShadowValue[] {
    const edge = depressed ? 1 : hovered && !blocked ? lip + 1 : lip;
    const layers: BoxShadowValue[] = [
      { offsetX: 0, offsetY: edge, blurRadius: 0, color: depth },
    ];
    if (control) {
      layers.unshift({ inset: true, offsetX: 0, offsetY: 1, blurRadius: 0, color: dark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.7)" });
      layers.push(depressed
        ? { offsetX: 0, offsetY: 2, blurRadius: 4, spreadDistance: -2, color: shade(face, 0.35) }
        : { offsetX: 0, offsetY: lip + 5, blurRadius: lip * 2 + 8, spreadDistance: -(lip + 1), color: shade(face, dark ? 0.45 : 0.28) });
    }
    return layers;
  }
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
          // A small spring back up, so the release feels alive (instant with reduce motion).
          pressed.set(reduced ? 0 : withSpring(0, { damping: 14, stiffness: 420, mass: 0.6 }));
        }
        onPressOut?.(e);
      }}
      onFocus={(e) => { setFocused(true); onFocus?.(e); }}
      onBlur={(e) => { setFocused(false); onBlur?.(e); }}
      onHoverIn={(e) => { setHovered(true); onHoverIn?.(e); }}
      onHoverOut={(e) => { setHovered(false); onHoverOut?.(e); }}
      style={[style, surface, feedback]}
    >
      {layered && control && !inactive ? (
        <>
          {/* A faint light on the upper face, so it reads as a lit surface rather than flat paint. */}
          <LinearGradient
            pointerEvents="none"
            colors={dark ? ["rgba(255,255,255,0.09)", "rgba(255,255,255,0)"] : ["rgba(255,255,255,0.45)", "rgba(255,255,255,0)"]}
            locations={[0, 0.6]}
            style={[StyleSheet.absoluteFill, { borderRadius: flat.borderRadius ?? radius.md }]}
          />
          {children}
        </>
      ) : (
        children
      )}
    </AnimatedPressable>
  );
}
