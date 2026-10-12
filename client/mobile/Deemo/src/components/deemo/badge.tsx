import { useEffect, useId } from "react";
import Animated, { useAnimatedProps, useSharedValue, withSequence, withTiming, Easing } from "react-native-reanimated";
import { Circle, ClipPath, Defs, G, Path, Rect } from "react-native-svg";

import { colors } from "@/theme";

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedPath = Animated.createAnimatedComponent(Path);

const SWEEP = Easing.bezier(0.77, 0, 0.175, 1); // on-screen movement: ease-in-out

// A five-point star centered on (cx, cy).
function star(cx: number, cy: number, outer: number, inner: number) {
  return (
    Array.from({ length: 10 }, (_, i) => {
      const r = i % 2 ? inner : outer;
      const a = (Math.PI / 5) * i - Math.PI / 2;
      return `${i ? "L" : "M"}${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
    }).join(" ") + "Z"
  );
}

// Deemo's Premium badge: a gold medal on a short ribbon, pinned on the suit's right lapel, in Deemo's 100 × 85 units.
// Now and then (every 6–9 s, never in a loop that runs every frame) a light glint sweeps across it and a tiny sparkle
// flares, 700 ms in all. Between sweeps nothing animates. `still` (reduce motion) keeps it gold and quiet.
export function PremiumBadge({ cx = 77, cy = 66, still }: { cx?: number; cy?: number; still?: boolean }) {
  const clip = `badge${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const shine = useSharedValue(0);

  useEffect(() => {
    if (still) return;
    let t: ReturnType<typeof setTimeout>;
    const next = (wait: number) => {
      t = setTimeout(() => {
        shine.value = withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: 700, easing: SWEEP }));
        next(6000 + Math.random() * 3000);
      }, wait);
    };
    next(1500);
    return () => clearTimeout(t);
  }, [shine, still]);

  const glint = useAnimatedProps(() => ({
    x: cx - 16 + 30 * shine.value,
    opacity: shine.value > 0 && shine.value < 1 ? 0.9 : 0,
  }));
  const sparkle = useAnimatedProps(() => ({ opacity: Math.max(0, 1 - Math.abs(shine.value - 0.75) * 5) }));

  const r = 9;
  return (
    <G>
      <Defs>
        <ClipPath id={clip}>
          <Circle cx={cx} cy={cy} r={r} />
        </ClipPath>
      </Defs>
      {/* ribbon tails */}
      <Path d={`M${cx - 6} ${cy + 3} L${cx - 9} ${cy + 15} L${cx - 4} ${cy + 12} L${cx - 1} ${cy + 16} L${cx + 1} ${cy + 5}Z`} fill={colors.goldInk} />
      <Path d={`M${cx + 6} ${cy + 3} L${cx + 9} ${cy + 15} L${cx + 4} ${cy + 12} L${cx + 1} ${cy + 16} L${cx - 1} ${cy + 5}Z`} fill={colors.gold} />
      {/* medal: rim, face, star */}
      <Circle cx={cx} cy={cy} r={r} fill={colors.gold} stroke={colors.goldInk} strokeWidth={1.6} />
      <Circle cx={cx} cy={cy} r={r - 3} fill="none" stroke={colors.goldLight} strokeWidth={1} opacity={0.8} />
      <Path d={star(cx, cy, 4.2, 1.9)} fill={colors.goldLight} />
      {/* the glint, clipped to the medal */}
      <G clipPath={`url(#${clip})`}>
        <G rotation={25} origin={`${cx}, ${cy}`}>
          <AnimatedRect animatedProps={glint} y={cy - 14} width={4} height={28} fill={colors.paper} opacity={0} />
        </G>
      </G>
      {/* a four-point sparkle at the rim */}
      <AnimatedPath
        animatedProps={sparkle}
        d={`M${cx + 8} ${cy - 13} Q${cx + 8.6} ${cy - 9.6} ${cx + 12} ${cy - 9} Q${cx + 8.6} ${cy - 8.4} ${cx + 8} ${cy - 5} Q${cx + 7.4} ${cy - 8.4} ${cx + 4} ${cy - 9} Q${cx + 7.4} ${cy - 9.6} ${cx + 8} ${cy - 13}Z`}
        fill={colors.goldLight}
        opacity={0}
      />
    </G>
  );
}
