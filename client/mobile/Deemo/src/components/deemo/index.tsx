import { useEffect } from "react";
import type { ViewStyle } from "react-native";
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";

import { colors, easeOut } from "@/theme";

export type DeemoMood = "idle" | "cheering" | "reading" | "encouraging" | "waving" | "sleepy";

// L: onboarding hero. M: cards, empty states, waits. S: inline notes (no cheeks).
const WIDTH = { l: 136, m: 76, s: 40 } as const;

// Drawn in a 100 × 85 box (the body), padded so the hand, sparks and z's can reach outside it while the
// component's layout footprint stays the body itself.
const W = 100;
const H = 85;
const PAD = 14;

// The brand pebble, CSS "58% 42% 52% 48% / 55% 50% 50% 45%", drawn exactly with elliptical corners.
const BODY = (() => {
  const [tl, tr, br, bl] = [
    [0.58 * W, 0.55 * H],
    [0.42 * W, 0.5 * H],
    [0.52 * W, 0.5 * H],
    [0.48 * W, 0.45 * H],
  ];
  return [
    `M${tl[0]} 0`,
    `A${tr[0]} ${tr[1]} 0 0 1 ${W} ${tr[1]}`,
    `A${br[0]} ${br[1]} 0 0 1 ${W - br[0]} ${H}`,
    `A${bl[0]} ${bl[1]} 0 0 1 0 ${H - bl[1]}`,
    `A${tl[0]} ${tl[1]} 0 0 1 ${tl[0]} 0Z`,
  ].join(" ");
})();

const EYE = { y: 31.5, dx: 17, rx: 7, ry: 9, pupil: 3.8 };
const LENS = 15; // glasses: one round lens around each eye
const INK = 3.2; // stroke width for glasses and face lines

const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  mood?: DeemoMood;
  size?: keyof typeof WIDTH;
  look?: "left" | "right"; // pupils drift toward the speech bubble
  style?: ViewStyle;
};

// Deemo, the app's guide (design D1–D5): the brand pebble in solid dusk with paper eyes, soft cheeks, a small
// smile and big round glasses. Flat fills only. The body holds still; only the face and gestures move, and with
// reduce motion everything holds still and the mood reads from shape. Decorative: screen readers read the words
// beside it.
export function Deemo({ mood = "idle", size = "m", look, style }: Props) {
  const w = WIDTH[size];
  const k = w / W; // px per unit
  const reduced = useReducedMotion();

  // Blink every 4–7 s (randomized), 120 ms. Only open eyes blink.
  const lid = useSharedValue(1);
  const opensEyes = mood !== "cheering" && mood !== "sleepy";
  useEffect(() => {
    if (reduced || !opensEyes) return;
    let t: ReturnType<typeof setTimeout>;
    const next = () => {
      t = setTimeout(() => {
        lid.value = withSequence(withTiming(0.08, { duration: 60 }), withTiming(1, { duration: 60 }));
        next();
      }, 4000 + Math.random() * 3000);
    };
    next();
    return () => clearTimeout(t);
  }, [lid, opensEyes, reduced]);

  // Cheer: one 300 ms hop, then still.
  const hop = useSharedValue(0);
  useEffect(() => {
    if (reduced || mood !== "cheering") return;
    hop.value = withSequence(
      withTiming(-0.08 * w, { duration: 150, easing: easeOut }),
      withTiming(0, { duration: 150, easing: easeOut }),
    );
  }, [hop, mood, reduced, w]);

  // Wave: the hand rocks 0 → 22°, three times, then rests.
  const wave = useSharedValue(0);
  useEffect(() => {
    if (reduced || mood !== "waving") return;
    wave.value = withDelay(
      200,
      withRepeat(withSequence(withTiming(22, { duration: 220 }), withTiming(0, { duration: 220 })), 3),
    );
  }, [wave, mood, reduced]);

  // Look: pupils drift toward the bubble.
  const gaze = useSharedValue(0);
  useEffect(() => {
    const to = look === "right" ? 1 : look === "left" ? -1 : 0;
    gaze.value = reduced ? to : withTiming(to, { duration: 400, easing: easeOut });
  }, [gaze, look, reduced]);

  const hopping = useAnimatedStyle(() => ({ transform: [{ translateY: hop.value }] }));
  const eyeL = useAnimatedProps(() => ({ ry: EYE.ry * lid.value }));
  const eyeR = useAnimatedProps(() => ({ ry: EYE.ry * lid.value }));
  const pupilL = useAnimatedProps(() => ({
    cx: 50 - EYE.dx + gaze.value * 2.2,
    r: lid.value < 0.5 ? 0 : EYE.pupil,
  }));
  const pupilR = useAnimatedProps(() => ({
    cx: 50 + EYE.dx + gaze.value * 2.2,
    r: lid.value < 0.5 ? 0 : EYE.pupil,
  }));
  // The hand swings on a pivot at the shoulder, so its center travels an arc.
  const hand = useAnimatedProps(() => {
    const a = ((-50 - wave.value) * Math.PI) / 180;
    return { cx: 93 + 14 * Math.cos(a), cy: 32 + 14 * Math.sin(a) };
  });

  const tilt = mood === "encouraging" ? -8 : 0;
  const slip = mood === "sleepy"; // glasses slide down the nose
  const down = mood === "reading" ? 3 : 1.5; // pupils sit low; lower still when reading
  const ex = [50 - EYE.dx, 50 + EYE.dx];
  const line = { stroke: colors.paper, strokeWidth: INK, strokeLinecap: "round", fill: "none" } as const;

  return (
    <Animated.View
      style={[{ width: w, height: H * k }, hopping, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
    >
      <Svg
        width={(W + 2 * PAD) * k}
        height={(H + 2 * PAD) * k}
        viewBox={`${-PAD} ${-PAD} ${W + 2 * PAD} ${H + 2 * PAD}`}
        style={{ margin: -PAD * k }}
      >
        {mood === "waving" ? <AnimatedEllipse animatedProps={hand} rx={9} ry={8} fill={colors.dusk} /> : null}

        <G rotation={tilt} origin="50, 45">
          <Path d={BODY} fill={colors.dusk} />

          {/* Cheeks (not at S) */}
          {size !== "s" ? (
            <G fill={colors.duskTint} opacity={0.55}>
              <Ellipse cx={20} cy={55} rx={6.5} ry={3.4} />
              <Ellipse cx={80} cy={55} rx={6.5} ry={3.4} />
            </G>
          ) : null}

          {/* Eyes */}
          {mood === "cheering" ? (
            ex.map((x) => <Path key={x} d={`M${x - 6} ${EYE.y + 2} Q${x} ${EYE.y - 6} ${x + 6} ${EYE.y + 2}`} {...line} />)
          ) : mood === "sleepy" ? (
            ex.map((x) => <Path key={x} d={`M${x - 6} ${EYE.y + 3} L${x + 6} ${EYE.y + 3}`} {...line} />)
          ) : (
            <>
              <AnimatedEllipse animatedProps={eyeL} cx={ex[0]} cy={EYE.y} rx={EYE.rx} ry={EYE.ry} fill={colors.paper} />
              <AnimatedEllipse animatedProps={eyeR} cx={ex[1]} cy={EYE.y} rx={EYE.rx} ry={EYE.ry} fill={colors.paper} />
              <AnimatedCircle animatedProps={pupilL} cx={ex[0]} cy={EYE.y + down} r={EYE.pupil} fill={colors.duskInk} />
              <AnimatedCircle animatedProps={pupilR} cx={ex[1]} cy={EYE.y + down} r={EYE.pupil} fill={colors.duskInk} />
            </>
          )}

          {/* Glasses: two round lenses, a bridge, and arms back toward the edge of the head */}
          <G
            y={slip ? 4 : 0}
            rotation={slip ? -6 : 0}
            origin={`50, ${EYE.y}`}
            stroke={colors.duskInk}
            strokeWidth={INK}
            strokeLinecap="round"
            fill="none"
          >
            <Circle cx={ex[0]} cy={EYE.y} r={LENS} />
            <Circle cx={ex[1]} cy={EYE.y} r={LENS} />
            <Path d={`M${ex[0] + LENS} ${EYE.y - 1} Q50 ${EYE.y - 4} ${ex[1] - LENS} ${EYE.y - 1}`} />
            <Path d={`M${ex[0] - LENS} ${EYE.y - 1} L5 ${EYE.y - 3}`} />
            <Path d={`M${ex[1] + LENS} ${EYE.y - 1} L95 ${EYE.y - 3}`} />
          </G>

          {/* Mouth */}
          {mood === "cheering" ? (
            <Path d="M41 52 Q50 53 59 52 Q57 63 50 63 Q43 63 41 52Z" fill={colors.paper} />
          ) : mood === "sleepy" ? (
            <Path d="M47 57 L53 57" {...line} />
          ) : (
            <Path d="M42 53 Q50 60 58 53" {...line} />
          )}

          {/* Reading: a page held in front */}
          {mood === "reading" ? (
            <G rotation={-6} origin="50, 76">
              <Rect x={31} y={65} width={38} height={24} rx={3} fill={colors.paper} />
              <Path d="M36 72 H62 M36 77 H64 M36 82 H55" stroke={colors.duskSoft} strokeWidth={2.4} strokeLinecap="round" />
            </G>
          ) : null}
        </G>

        {/* Cheering: a few sparks. Sleepy: z z. */}
        {mood === "cheering" ? (
          <G fill={colors.duskSoft}>
            <Circle cx={-6} cy={40} r={2.6} />
            <Circle cx={104} cy={24} r={2.2} />
            <Circle cx={107} cy={50} r={1.8} />
          </G>
        ) : null}
        {mood === "sleepy" ? (
          <G stroke={colors.duskInk} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none">
            <Path d="M94 -8 H103 L94 2 H103" />
            <Path d="M105 8 H110 L105 14 H110" strokeWidth={2} />
          </G>
        ) : null}
      </Svg>
    </Animated.View>
  );
}
