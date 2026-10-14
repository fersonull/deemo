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
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";

import { touchPoint } from "@/hooks/touch-point";
import { useSession } from "@/hooks/use-session";
import { colors, easeOut } from "@/theme";

import { PremiumBadge } from "./badge";
import { Suit } from "./suit";

export type DeemoMood = "idle" | "cheering" | "reading" | "encouraging" | "waving" | "sleepy" | "nervous";

// XL: full-screen states (offline). L: onboarding hero. M: cards, empty states, waits. S: inline notes.
const WIDTH = { xl: 220, l: 136, m: 76, s: 40 } as const;

// Drawn in the owl study's units (docs/design/owl/make-owl.ts). The layout footprint is the owl itself, from wing
// to wing and cap to feet; the padding lets the raised wing, sparks and z's reach outside it.
const X0 = 64;
const Y0 = 62;
const W = 272;
const H = 292;
const PAD = 36;

// A round little owl: one body, a big face, short wings, a black mortarboard.
const BODY =
  "M200 112 C292 112 322 170 318 232 C314 300 268 344 200 344 C132 344 86 300 82 232 C78 170 108 112 200 112 Z";
const FACE = "M200 170 C178 144 116 144 112 200 C108 250 160 268 200 248 C240 268 292 250 288 200 C284 144 222 144 200 170 Z";
const WING = {
  l: { d: "M96 236 C70 252 64 292 82 308 C100 300 112 278 112 254 Z", o: [102, 246], f: "M90 268 Q86 284 90 298" },
  r: { d: "M304 236 C330 252 336 292 318 308 C300 300 288 278 288 254 Z", o: [298, 246], f: "M310 268 Q314 284 310 298" },
} as const;
// The waving wing is lifted out to the body's edge and raised; it rocks on that shoulder.
const RAISED = { dx: 26, dy: -18, angle: -135 };
const EYES = [160, 240];
const EYE_Y = 204;
const EYE_R = 32;
const LINE = 6; // outline width

const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  mood?: DeemoMood;
  size?: keyof typeof WIDTH;
  look?: "left" | "right"; // pupils drift toward the speech bubble
  startle?: boolean; // on mount: a quick head-shake with a nervous face, then back to `mood` (an error just happened)
  suited?: boolean; // force the Premium suit on (a preview, like the upgrade sheet); by default it follows the plan
  style?: ViewStyle;
};

const ink = { stroke: colors.duskInk, strokeLinecap: "round", strokeLinejoin: "round" } as const;

// Deemo, the app's guide: a round dusk owl in a black graduation cap, with a paper belly, big paper eyes, a small
// amber beak and soft cheeks (owl study in docs/design/owl). Premium students' Deemo wears a black suit with a gold
// bow tie and a shining gold medal. Flat fills only. The body holds still; the eyes, wings and small hops move, and
// with reduce motion everything holds still and the mood reads from shape. Decorative: screen readers read the
// words beside it.
export function Deemo({ mood: base = "idle", size = "m", look, startle, suited: dressed, style }: Props) {
  const w = WIDTH[size];
  const k = w / W; // px per unit
  const small = size === "s";
  const reduced = useReducedMotion();
  const { premium } = useSession();
  const suited = (dressed ?? premium) && !small; // Premium: Deemo suits up with a gold medal (not at S: too small)

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

  // Wave: the raised wing rocks 0 → 22°, three times, then folds back down to its side (a 150 ms cross-fade).
  // With reduce motion it stays raised, still, so the mood still reads from shape.
  const wave = useSharedValue(0);
  const raised = useSharedValue(1);
  useEffect(() => {
    raised.value = 1;
    if (reduced || mood !== "waving") return;
    wave.value = withDelay(
      200,
      withRepeat(withSequence(withTiming(22, { duration: 220 }), withTiming(0, { duration: 220 })), 3, false, (done) => {
        if (done) raised.value = withTiming(0, { duration: 150, easing: easeOut });
      }),
    );
  }, [wave, raised, mood, reduced]);

  // Look: at rest the pupils drift toward the bubble (`look`). While the student touches the screen they follow
  // the finger, measured live from where Deemo sits (so scrolling doesn't throw them off), and a moment after the
  // finger lifts they drift back. With reduce motion they stay at rest.
  const body = useAnimatedRef<Animated.View>();
  const restX = look === "right" ? 6 : look === "left" ? -6 : 0;
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
      const dy = t.y - (m.pageY + m.height * 0.49); // the eyes' line
      const len = Math.hypot(dx, dy) || 1;
      const reach = Math.min(1, len / 120); // close touches look a little, far ones all the way
      gazeX.set(withSpring((dx / len) * reach * 9, spring));
      gazeY.set(withSpring((dy / len) * reach * 8, spring));
    },
  );

  const moving = useAnimatedStyle(() => ({ transform: [{ translateY: hop.value }, { translateX: shake.value }] }));

  const tilt = mood === "encouraging" ? -6 : mood === "nervous" ? 3 : 0;
  const waving = mood === "waving";
  const box = { width: (W + 2 * PAD) * k, height: (H + 2 * PAD) * k };
  const viewBox = `${X0 - PAD} ${Y0 - PAD} ${W + 2 * PAD} ${H + 2 * PAD}`;
  const layer = { position: "absolute", left: -PAD * k, top: -PAD * k } as const;

  return (
    <Animated.View
      ref={body}
      style={[{ width: w, height: H * k }, moving, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
    >
      <Svg {...box} viewBox={viewBox} style={layer}>
        <Feet />
        <G rotation={tilt} origin="200, 230">
          <Path d={BODY} fill={colors.dusk} />
          <Ellipse cx={200} cy={298} rx={68} ry={42} fill={colors.paper} />
          {small || suited || mood === "reading" ? null : <Scallops />}
          {suited ? <Suit /> : null}
          {suited ? <PremiumBadge cx={236} cy={302} scale={1.95} still={reduced} /> : null}
          <Path d={BODY} fill="none" strokeWidth={LINE} {...ink} />
          <Path d={FACE} fill={colors.duskTint} />
          <Ellipse cx={116} cy={246} rx={15} ry={8.5} fill={colors.clayTint} opacity={0.9} />
          <Ellipse cx={284} cy={246} rx={15} ry={8.5} fill={colors.clayTint} opacity={0.9} />

          {mood === "cheering" ? (
            EYES.map((x) => <Path key={x} d={`M${x - 22} 212 Q${x} 184 ${x + 22} 212`} fill="none" strokeWidth={7} {...ink} />)
          ) : mood === "sleepy" ? (
            EYES.map((x) => <Path key={x} d={`M${x - 22} 204 Q${x} 220 ${x + 22} 204`} fill="none" strokeWidth={7} {...ink} />)
          ) : (
            EYES.map((x, i) => (
              <Eye
                key={x}
                x={x}
                inward={mood === "reading" ? 0 : i ? -3 : 3}
                down={mood === "reading" ? 9 : 2}
                pupil={mood === "nervous" ? 10 : 17}
                speck={!small}
                lid={lid}
                gazeX={gazeX}
                gazeY={gazeY}
              />
            ))
          )}
          {mood === "encouraging"
            ? EYES.map((x) => (
                <G key={x}>
                  <Path d={`M${x - 20} 160 Q${x} 150 ${x + 20} 160`} fill="none" strokeWidth={5} {...ink} />
                  <Path d={`M${x - 30} 222 Q${x} 246 ${x + 30} 222 L${x + 34} 240 L${x - 34} 240 Z`} fill={colors.duskTint} />
                  <Path d={`M${x - 28} 222 Q${x} 242 ${x + 28} 222`} fill="none" strokeWidth={LINE - 1} {...ink} />
                </G>
              ))
            : null}
          <Beak mood={mood} />

          {mood === "nervous" ? (
            <>
              <Path
                d="M112 140 Q100 162 104 172 Q110 182 120 176 Q128 168 112 140 Z"
                fill={colors.duskTint}
                stroke={colors.duskIcon}
                strokeWidth={3.5}
                strokeLinejoin="round"
              />
              <Path d="M130 162 Q150 156 170 166 M230 166 Q250 156 270 162" fill="none" strokeWidth={5} {...ink} />
            </>
          ) : null}
          {mood === "reading" ? (
            <G rotation={-4} origin="200, 300">
              <Rect x={146} y={262} width={108} height={72} rx={8} fill={colors.paper} stroke={colors.inkMuted} strokeWidth={3.5} />
              <Path d="M162 282 H238 M162 296 H230 M162 310 H214" stroke={colors.duskSoft} strokeWidth={5} strokeLinecap="round" />
            </G>
          ) : null}

          <Wing side="l" angle={mood === "cheering" ? 128 : mood === "reading" ? -38 : mood === "nervous" ? -22 : 0} />
          {waving ? null : (
            <Wing
              side="r"
              {...(mood === "cheering"
                ? { angle: -128 }
                : mood === "reading"
                  ? { angle: 38 }
                  : mood === "nervous"
                    ? { angle: 22 }
                    : mood === "encouraging"
                      ? { angle: -100, dx: 18, dy: -4 }
                      : {})}
            />
          )}
          <Cap mood={mood} />
        </G>

        {mood === "cheering" ? (
          <G fill={colors.amber}>
            <Spark x={70} y={120} r={14} />
            <Spark x={334} y={104} r={11} />
            <Spark x={352} y={160} r={8} />
          </G>
        ) : null}
        {mood === "sleepy" ? (
          <G fill="none" {...ink}>
            <Path d="M300 94 H326 L300 122 H326" strokeWidth={7} />
            <Path d="M336 62 H352 L336 80 H352" strokeWidth={5} opacity={0.7} />
          </G>
        ) : null}
      </Svg>

      {waving ? <WavingWing k={k} box={box} viewBox={viewBox} layer={layer} wave={wave} raised={raised} /> : null}
    </Animated.View>
  );
}

// One eye: a paper disc that blinks (ry), a pupil and two highlights that follow the gaze and vanish mid-blink.
function Eye({
  x,
  inward,
  down,
  pupil,
  speck,
  lid,
  gazeX,
  gazeY,
}: {
  x: number;
  inward: number;
  down: number;
  pupil: number;
  speck: boolean;
  lid: SharedValue<number>;
  gazeX: SharedValue<number>;
  gazeY: SharedValue<number>;
}) {
  const room = EYE_R - pupil - 3; // the pupil stays inside the eye
  const white = useAnimatedProps(() => ({ ry: EYE_R * lid.value }));
  const at = () => {
    "worklet";
    const gx = Math.max(-room, Math.min(room, inward + gazeX.value));
    const gy = Math.max(-room, Math.min(room, down + gazeY.value));
    return { cx: x + gx, cy: EYE_Y + gy, open: lid.value >= 0.5 };
  };
  const dot = useAnimatedProps(() => {
    const p = at();
    return { cx: p.cx, cy: p.cy, r: p.open ? pupil : 0 };
  });
  const shine = useAnimatedProps(() => {
    const p = at();
    return { cx: p.cx + pupil * 0.38, cy: p.cy - pupil * 0.42, r: p.open ? pupil * 0.36 : 0 };
  });
  const glint = useAnimatedProps(() => {
    const p = at();
    return { cx: p.cx - pupil * 0.4, cy: p.cy + pupil * 0.36, r: p.open && speck ? pupil * 0.15 : 0 };
  });
  return (
    <G>
      <AnimatedEllipse animatedProps={white} cx={x} cy={EYE_Y} rx={EYE_R} ry={EYE_R} fill={colors.paper} strokeWidth={LINE - 1} {...ink} />
      <AnimatedCircle animatedProps={dot} cx={x + inward} cy={EYE_Y + down} r={pupil} fill={colors.duskInk} />
      <AnimatedCircle animatedProps={shine} cx={x + inward} cy={EYE_Y + down} r={pupil * 0.36} fill={colors.paper} />
      <AnimatedCircle animatedProps={glint} cx={x + inward} cy={EYE_Y + down} r={pupil * 0.15} fill={colors.paper} />
    </G>
  );
}

function Beak({ mood }: { mood: DeemoMood }) {
  const beak = { fill: colors.amber, stroke: colors.amberInk, strokeWidth: 3, strokeLinejoin: "round" } as const;
  if (mood === "cheering" || mood === "waving")
    return (
      <>
        <Path d="M190 237 Q200 233 210 237 Q206 244 200 246 Q194 244 190 237 Z" {...beak} />
        <Path d="M194 248 Q200 258 206 248 Z" fill={colors.amberInk} />
      </>
    );
  if (mood === "nervous")
    return (
      <>
        <Path d="M192 238 Q200 234 208 238 Q204 248 200 251 Q196 248 192 238 Z" {...beak} />
        <Path d="M186 262 Q191 257 196 262 Q201 267 206 262 Q211 257 214 262" fill="none" strokeWidth={3.5} {...ink} />
      </>
    );
  return <Path d="M191 238 Q200 233 209 238 Q205 249 200 253 Q195 249 191 238 Z" {...beak} />;
}

function Wing({ side, angle = 0, dx = 0, dy = 0 }: { side: "l" | "r"; angle?: number; dx?: number; dy?: number }) {
  const { d, o, f } = WING[side];
  return (
    <G x={dx} y={dy}>
      <G rotation={angle} origin={`${o[0]}, ${o[1]}`}>
        <Path d={d} fill={colors.duskIcon} strokeWidth={LINE} {...ink} />
        <Path d={f} fill="none" stroke={colors.duskInk} strokeOpacity={0.4} strokeWidth={3.5} strokeLinecap="round" />
      </G>
    </G>
  );
}

// The right wing while waving, on its own layer so it can rock on the shoulder (a view rotation, which Reanimated
// animates natively), with the folded wing underneath taking over once the wave is done.
function WavingWing({
  k,
  box,
  viewBox,
  layer,
  wave,
  raised,
}: {
  k: number;
  box: { width: number; height: number };
  viewBox: string;
  layer: ViewStyle;
  wave: SharedValue<number>;
  raised: SharedValue<number>;
}) {
  const pivot = [(WING.r.o[0] + RAISED.dx - (X0 - PAD)) * k, (WING.r.o[1] + RAISED.dy - (Y0 - PAD)) * k, 0];
  const up = useAnimatedStyle(() => ({ opacity: raised.value, transform: [{ rotate: `${-wave.value}deg` }] }));
  const down = useAnimatedStyle(() => ({ opacity: 1 - raised.value }));
  return (
    <>
      <Animated.View style={[layer, box, down]}>
        <Svg {...box} viewBox={viewBox}>
          <Wing side="r" />
        </Svg>
      </Animated.View>
      <Animated.View style={[layer, box, { transformOrigin: pivot }, up]}>
        <Svg {...box} viewBox={viewBox}>
          <Wing side="r" angle={RAISED.angle} dx={RAISED.dx} dy={RAISED.dy} />
        </Svg>
      </Animated.View>
    </>
  );
}

function Cap({ mood }: { mood: DeemoMood }) {
  const tilt = mood === "sleepy" ? -14 : mood === "nervous" ? 4 : -6;
  const drop = mood === "sleepy" ? 14 : mood === "cheering" ? -6 : 0;
  const black = { fill: colors.ink, stroke: colors.ink, strokeWidth: LINE, strokeLinejoin: "round" } as const;
  return (
    <G y={drop}>
      <G rotation={tilt} origin="200, 112">
        <Path d="M148 114 Q200 102 252 114 L248 136 Q200 126 152 136 Z" {...black} />
        <Path d="M200 68 L286 96 L200 124 L114 96 Z" {...black} />
        <Path d="M200 76 L262 96 L200 116 L138 96 Z" fill={colors.inkSoft} />
        <Path d="M200 96 Q246 94 280 100 L280 134" fill="none" stroke={colors.amber} strokeWidth={4} strokeLinecap="round" />
        <Circle cx={200} cy={96} r={6} fill={colors.amber} stroke={colors.amberInk} strokeWidth={2.5} />
        <Rect x={273} y={130} width={14} height={22} rx={5} fill={colors.amber} stroke={colors.amberInk} strokeWidth={3} />
      </G>
    </G>
  );
}

function Feet() {
  return (
    <G fill={colors.amber} stroke={colors.amberInk} strokeWidth={3}>
      {[176, 224].flatMap((x) =>
        [-11, 0, 11].map((d) => (
          <Ellipse key={`${x}${d}`} cx={x + d * 0.9} cy={345} rx={5.5} ry={8} rotation={d * 1.8} origin={`${x + d * 0.9}, 345`} />
        )),
      )}
    </G>
  );
}

function Scallops() {
  return (
    <G fill="none" stroke={colors.duskIcon} strokeOpacity={0.5} strokeWidth={3.5} strokeLinecap="round">
      {[
        [180, 288],
        [200, 288],
        [220, 288],
        [190, 306],
        [210, 306],
        [200, 324],
      ].map(([x, y]) => (
        <Path key={`${x}${y}`} d={`M${x - 8} ${y} Q${x} ${y + 8} ${x + 8} ${y}`} />
      ))}
    </G>
  );
}

function Spark({ x, y, r }: { x: number; y: number; r: number }) {
  const q = r * 0.15;
  return (
    <Path
      d={`M${x} ${y - r} Q${x + q} ${y - q} ${x + r} ${y} Q${x + q} ${y + q} ${x} ${y + r} Q${x - q} ${y + q} ${x - r} ${y} Q${x - q} ${y - q} ${x} ${y - r}Z`}
    />
  );
}
