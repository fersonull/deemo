import { useEffect, type ReactNode } from "react";
import { View, type DimensionValue, type ViewStyle } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { colors } from "@/theme";

// A list that's still loading, drawn as the real layout's shapes (Skeleton.Bone) that breathe together.
// Screen readers hear one "Loading"; with reduce motion the shapes hold still.
export function Skeleton({ label = "Loading", children }: { label?: string; children: ReactNode }) {
  const reduced = useReducedMotion();
  const fade = useSharedValue(1);
  useEffect(() => {
    if (!reduced) fade.value = withRepeat(withTiming(0.5, { duration: 900, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => cancelAnimation(fade); // endless: stop it when the list arrives
  }, [fade, reduced]);
  const style = useAnimatedStyle(() => ({ opacity: fade.value }));
  return (
    <Animated.View style={style} accessible accessibilityRole="progressbar" accessibilityLabel={label}>
      {children}
    </Animated.View>
  );
}

type BoneProps = { width?: DimensionValue; height: number; radius?: number; style?: ViewStyle };

function Bone({ width = "100%", height, radius = 6, style }: BoneProps) {
  return <View style={[{ width, height, borderRadius: radius, backgroundColor: colors.border }, style]} />;
}

Skeleton.Bone = Bone;
