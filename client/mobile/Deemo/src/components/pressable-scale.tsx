import type { ReactNode } from "react";
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";

import { easeOut } from "@/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, "style" | "children"> & {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number; // 0.97 for buttons, 0.98 for wide rows and cards
  children?: ReactNode;
};

// A Pressable that answers a press: a quick squeeze (100 ms in, 160 ms back, ease-out) so the app feels like it
// heard the tap. With reduce motion it dims a little instead of moving.
export function PressableScale({ style, scaleTo = 0.97, onPressIn, onPressOut, disabled, children, ...rest }: Props) {
  const reduced = useReducedMotion();
  const pressed = useSharedValue(0);
  const feedback = useAnimatedStyle(() =>
    reduced
      ? { opacity: 1 - 0.15 * pressed.value }
      : { transform: [{ scale: 1 - (1 - scaleTo) * pressed.value }] },
  );
  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(e) => {
        pressed.set(withTiming(1, { duration: 100, easing: easeOut }));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        pressed.set(withTiming(0, { duration: 160, easing: easeOut }));
        onPressOut?.(e);
      }}
      style={[style, feedback]}
    >
      {children}
    </AnimatedPressable>
  );
}
