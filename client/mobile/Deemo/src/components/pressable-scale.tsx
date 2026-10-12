import type { ComponentProps, ReactNode } from "react";
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";

import { easeOut } from "@/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, "style" | "children"> & {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number; // 0.97 for buttons, 0.98 for wide rows and cards
  entering?: ComponentProps<typeof AnimatedPressable>["entering"]; // e.g. a list's stagger
  children?: ReactNode;
};

// A Pressable that answers a press: a quick squeeze (100 ms in, 160 ms back, ease-out) so the app feels like it
// heard the tap. With reduce motion it dims a little instead of moving. Its transform is the squeeze, so don't give
// it a transform in `style` (it would be replaced); wrap it instead.
export function PressableScale({ entering, ...props }: Props) {
  // An entering animation runs on a wrapper: on the Pressable itself it would fight the press transform.
  if (!entering) return <Pressed {...props} />;
  return (
    <Animated.View entering={entering}>
      <Pressed {...props} />
    </Animated.View>
  );
}

function Pressed({ style, scaleTo = 0.97, onPressIn, onPressOut, disabled, children, ...rest }: Omit<Props, "entering">) {
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
