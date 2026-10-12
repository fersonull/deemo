import { useEffect, useState } from "react";
import type { ViewStyle } from "react-native";
import Animated, {
  measure,
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";

import { touchPoint } from "@/hooks/touch-point";
import { useSession } from "@/hooks/use-session";
import { colors, easeOut } from "@/theme";

import { PremiumBadge } from "./badge";
import { Suit } from "./suit";

export type DeemoMood = "idle" | "cheering" | "reading" | "encouraging" | "waving" | "sleepy" | "nervous";

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
  startle?: boolean; // on mount: a quick head-shake with a nervous face, then back to `mood` (an error just happened)
  style?: ViewStyle;
};

// Deemo, the app's guide (design D1–D5): the brand pebble in solid dusk with paper eyes, soft cheeks, a small
// smile and big round glasses. Flat fills only. The body holds still; only the face and gestures move, and with
// reduce motion everything holds still and the mood reads from shape. Decorative: screen readers read the words
// beside it.
export function Deemo({ mood: base = "idle", size = "m", look, startle, style }: Props) {
  const w = WIDTH[size];
  const k = w / W; // px per unit
  const reduced = useReducedMotion();
  const { premium } = useSession();
  const suited = premium && size !== "s"; // Premium: Deemo suits up with a gold pin (not at S: too small to read)

  // Startle: shake the head (±6% of the width, ~420 ms) with a nervous face, then settle back to the given mood.
  // With reduce motion there's no shake, but the face still changes for a moment.
  const [startled, setStartled] = useState(!!startle);
  const mood: DeemoMood = startled ? "nervous" : base;
  const shake = useSharedValue(0);
  useEffect(() => {
    if (!startle) return;
    if (!reduced) {
      const a = 0.06 * w;
      shake.value = withSequence(
        withTiming(-a, { duration: 50 }),
        withTiming(a, { duration: 70 }),
        withTiming(-a * 0.75, { duration: 70 }),
        withTiming(a * 0.5, { duration: 70 }),
        withTiming(-a * 0.25, { duration: 70 }),
        withTiming(0, { duration: 90, easing: easeOut }),
      );
    }
    const t = setTimeout(() => setStartled(false), 700);
    return () => clearTimeout(t);
  }, [startle, reduced, shake, w]);

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

  // Wave: the hand rocks 0 → 22°, three times, then tucks away (fades out). With reduce motion it stays,
  // still, so the mood still reads from shape.
  const wave = useSharedValue(0);
  const handShown = useSharedValue(1);
  useEffect(() => {
    handShown.value = 1;
    if (reduced || mood !== "waving") return;
    wave.value = withDelay(
      200,
      withRepeat(withSequence(withTiming(22, { duration: 220 }), withTiming(0, { duration: 220 })), 3, false, (done) => {
        if (done) handShown.value = withTiming(0, { duration: 150, easing: easeOut });
      }),
    );
  }, [wave, handShown, mood, reduced]);

  // Look: at rest the pupils drift toward the bubble (`look`). While the student touches the screen they follow
  // the finger, measured live from where Deemo sits (so scrolling doesn't throw them off), and a moment after the
  // finger lifts they drift back. With reduce motion they stay at rest.
  const body = useAnimatedRef<Animated.View>();
  const restX = look === "right" ? 2.2 : look === "left" ? -2.2 : 0;
  const gazeX = useSharedValue(restX);
  const gazeY = useSharedValue(0);
  useEffect(() => {
    gazeX.value = reduced ? restX : withTiming(restX, { duration: 400, easing: easeOut });
  }, [gazeX, restX, reduced]);
  useAnimatedReaction(
    () => touchPoint.value,
    (t, prev) => {
      if (reduced || !prev || t.at === prev.at) return;
      const spring = { damping: 18, stiffness: 160 };
      if (!t.down) {
        gazeX.set(withDelay(900, withSpring(restX, spring)));
        gazeY.set(withDelay(900, withSpring(0, spring)));
        return;
      }
      const m = measure(body);
      if (!m) return;
      const dx = t.x - (m.pageX + m.width / 2);
      const dy = t.y - (m.pageY + m.height * 0.37);
      const len = Math.hypot(dx, dy) || 1;
      const reach = Math.min(1, len / 120); // close touches look a little, far ones all the way
      gazeX.set(withSpring((dx / len) * reach * 2.8, spring));
      gazeY.set(withSpring((dy / len) * reach * 2.4, spring));
    },
  );

  const hopping = useAnimatedStyle(() => ({ transform: [{ translateY: hop.value }, { translateX: shake.value }] }));
  const eyeL = useAnimatedProps(() => ({ ry: EYE.ry * lid.value }));
  const eyeR = useAnimatedProps(() => ({ ry: EYE.ry * lid.value }));
  const down = mood === "reading" ? 3 : 1.5; // pupils sit low; lower still when reading
  const pupilL = useAnimatedProps(() => ({
    cx: 50 - EYE.dx + gazeX.value,
    cy: EYE.y + Math.min(4.5, down + gazeY.value), // stays inside the eye
    r: lid.value < 0.5 ? 0 : EYE.pupil,
  }));
  const pupilR = useAnimatedProps(() => ({
    cx: 50 + EYE.dx + gazeX.value,
    cy: EYE.y + Math.min(4.5, down + gazeY.value), // stays inside the eye
    r: lid.value < 0.5 ? 0 : EYE.pupil,
  }));
  // The hand swings on a pivot at the shoulder, so its center travels an arc.
  const hand = useAnimatedProps(() => {
    const a = ((-50 - wave.value) * Math.PI) / 180;
    return { cx: 93 + 14 * Math.cos(a), cy: 32 + 14 * Math.sin(a), opacity: handShown.value };
  });

  const tilt = mood === "encouraging" ? -8 : mood === "nervous" ? 4 : 0;
  const slip = mood === "sleepy"; // glasses slide down the nose
  const ex = [50 - EYE.dx, 50 + EYE.dx];
  const line = { stroke: colors.paper, strokeWidth: INK, strokeLinecap: "round", fill: "none" } as const;

  return (
    <Animated.View
      ref={body}
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
          {suited ? <Suit body={BODY} /> : null}

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
          ) : mood === "nervous" ? (
            <Path d="M41 56 Q44 52.5 47 56 Q50 59.5 53 56 Q56 52.5 59 56" {...line} />
          ) : (
            <Path d="M42 53 Q50 60 58 53" {...line} />
          )}

          {suited ? <PremiumBadge cx={72} cy={73} still={reduced} /> : null}

          {/* Reading: a page held in front */}
          {mood === "reading" ? (
            <G rotation={-6} origin="50, 76">
              <Rect x={31} y={65} width={38} height={24} rx={3} fill={colors.paper} />
              <Path d="M36 72 H62 M36 77 H64 M36 82 H55" stroke={colors.duskSoft} strokeWidth={2.4} strokeLinecap="round" />
            </G>
          ) : null}
        </G>

        {/* Nervous: a small sweat drop at the temple */}
        {mood === "nervous" ? (
          <Path d="M91 14 Q95 21 91 24 Q87 21 91 14Z" fill={colors.duskSoft} />
        ) : null}

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
