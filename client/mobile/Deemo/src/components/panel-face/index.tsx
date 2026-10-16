import { useEffect, useId } from "react";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, ClipPath, Defs, Ellipse, G, Path } from "react-native-svg";

import { panelVoice } from "@/live/voice-level";
import { colors } from "@/theme";

import { BEARD, browPath, EYE_Y, EYES, GLASSES, hairPaths, HEAD, mouthPath, MUSTACHE, NECK, SHOULDERS, topPaths } from "./parts";
import { PERSONAS } from "./personas";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
const AnimatedG = Animated.createAnimatedComponent(G);

export type FaceMood = "listening" | "speaking" | "thinking" | "skeptical" | "offline";

// What each mood does to the face; every change eases in over 220 ms, so faces never snap.
const MOODS: Record<FaceMood, { lift: number; tilt: number; raise: number; smile: number; narrow: number; gazeX: number; gazeY: number; closed: number }> = {
  listening: { lift: 0, tilt: 0.4, raise: 0, smile: 0.4, narrow: 0, gazeX: 0, gazeY: 0.6, closed: 0 }, // polite, eyes on the student
  speaking: { lift: -0.5, tilt: 0.1, raise: 0, smile: 0.15, narrow: 0, gazeX: 0, gazeY: 0, closed: 0 },
  thinking: { lift: -1.2, tilt: 0.7, raise: 0, smile: -0.25, narrow: 1, gazeX: -1.6, gazeY: -1.8, closed: 0 }, // looks up and aside, "hmm"
  skeptical: { lift: 0.8, tilt: -0.9, raise: -3.4, smile: -0.35, narrow: 0.3, gazeX: 0.4, gazeY: 0, closed: 0 }, // one brow up, the other low
  offline: { lift: 0, tilt: 0, raise: 0, smile: 0, narrow: 0, gazeX: 0, gazeY: 0.5, closed: 1 }, // eyes shut while joining
};
const EASE = { duration: 220, easing: Easing.out(Easing.cubic) };

// A panelist as a flat bust in a circle (components/panel-face/personas.ts). Alive in the session: random blinks, a
// slow breath, nods that follow the student's mic `level` while listening, and a mouth that follows the panel's real
// voice (panelVoice, from the live engine) while speaking. `still` (small faces, reduce motion) keeps it calm.
export function PanelFace({
  index,
  size,
  mood = "listening",
  level = 0,
  still,
}: {
  index: number;
  size: number;
  mood?: FaceMood;
  level?: number;
  still?: boolean;
}) {
  const p = PERSONAS[index % PERSONAS.length]!;
  const clip = `face${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const reduced = useReducedMotion();
  const calm = still || size <= 28;
  const quiet = calm || reduced;

  const m = MOODS[mood];
  const lift = useSharedValue(m.lift);
  const tilt = useSharedValue(m.tilt);
  const raise = useSharedValue(m.raise);
  const smile = useSharedValue(m.smile);
  const narrow = useSharedValue(m.narrow);
  const gazeX = useSharedValue(m.gazeX);
  const gazeY = useSharedValue(m.gazeY);
  const closed = useSharedValue(m.closed);
  const speaking = useSharedValue(mood === "speaking" ? 1 : 0);
  const lid = useSharedValue(1);
  const breath = useSharedValue(0);
  const nod = useSharedValue(0);

  useEffect(() => {
    const t = MOODS[mood];
    const to = (v: typeof lift, x: number) => (v.value = calm ? x : withTiming(x, EASE));
    to(lift, t.lift);
    to(tilt, t.tilt);
    to(raise, t.raise);
    to(smile, t.smile);
    to(narrow, t.narrow);
    to(gazeX, t.gazeX);
    to(gazeY, t.gazeY);
    to(closed, t.closed);
    speaking.value = mood === "speaking" ? 1 : 0;
  }, [mood, calm, lift, tilt, raise, smile, narrow, gazeX, gazeY, closed, speaking]);

  // Blinks at random, 2.5–6 s apart, each face on its own clock; a slow breath. Timers, not a frame loop.
  useEffect(() => {
    if (quiet) return;
    let timer: ReturnType<typeof setTimeout>;
    const blink = (wait: number) => {
      timer = setTimeout(() => {
        lid.value = withSequence(withTiming(0.08, { duration: 70 }), withTiming(1, { duration: 110 }));
        blink(2500 + Math.random() * 3500);
      }, wait);
    };
    blink(600 + Math.random() * 3000);
    breath.value = withRepeat(withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => {
      clearTimeout(timer);
      cancelAnimation(breath);
    };
  }, [quiet, lid, breath]);

  // Small nods while the student is actually speaking.
  useEffect(() => {
    if (quiet) return;
    nod.value = withTiming(mood === "listening" ? Math.min(1, level * 1.6) : 0, { duration: 160 });
  }, [quiet, mood, level, nod]);

  const head = useAnimatedProps(() => ({ transform: `translate(0 ${breath.value * 0.8 + nod.value * 1.8})` }));
  const mouth = useAnimatedProps(() => ({
    d: mouthPath(speaking.value ? panelVoice.value : 0, smile.value, narrow.value),
  }));
  // Positive tilt lifts the inner ends (open, attentive); negative lowers them (stern). The right brow is mirrored.
  const leftBrow = useAnimatedProps(() => ({ d: browPath(EYES[0], lift.value + raise.value, tilt.value) }));
  const rightBrow = useAnimatedProps(() => ({ d: browPath(EYES[1], lift.value, -tilt.value) }));
  const leftEye = useAnimatedProps(() => ({ cx: EYES[0] + gazeX.value, cy: EYE_Y + gazeY.value, ry: 2.6 * lid.value * (1 - closed.value * 0.88) }));
  const rightEye = useAnimatedProps(() => ({ cx: EYES[1] + gazeX.value, cy: EYE_Y + gazeY.value, ry: 2.6 * lid.value * (1 - closed.value * 0.88) }));

  const top = topPaths(p.top.style);
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessible={false}>
      <Defs>
        <ClipPath id={clip}>
          <Circle cx={50} cy={50} r={50} />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${clip})`}>
        <Circle cx={50} cy={50} r={50} fill={p.circle} />
        {/* the person fills more of the circle than the 100-unit drawing, as in a flat avatar */}
        <G transform="translate(50 64) scale(1.14) translate(-50 -64)">
        <Path d={SHOULDERS} fill={p.top.cloth} />
        {top.inner.map((d) => (
          <Path key={d} d={d} fill={p.top.inner} />
        ))}
        <Path d={NECK} fill={p.skinShade} />
        {top.trim.map((d) => (
          <Path key={d} d={d} fill={p.top.style === "polo" ? p.top.inner : colors.paper} opacity={p.top.style === "blazer" ? 0.14 : 0.9} />
        ))}
        <AnimatedG animatedProps={head}>
          <Circle cx={31} cy={48} r={4.2} fill={p.skinShade} />
          <Circle cx={69} cy={48} r={4.2} fill={p.skinShade} />
          <Path d={HEAD} fill={p.skin} />
          {p.beard ? <Path d={BEARD} fill={p.hair} /> : null}
          {hairPaths(p.hairStyle).map((d) => (
            <Path key={d} d={d} fill={p.hair} />
          ))}
          <Ellipse cx={50} cy={52.5} rx={2.2} ry={1.6} fill={p.skinShade} />
          <AnimatedEllipse animatedProps={leftEye} rx={2.3} fill={colors.ink} />
          <AnimatedEllipse animatedProps={rightEye} rx={2.3} fill={colors.ink} />
          <AnimatedPath animatedProps={leftBrow} stroke={p.hair} strokeWidth={2.2} strokeLinecap="round" fill="none" />
          <AnimatedPath animatedProps={rightBrow} stroke={p.hair} strokeWidth={2.2} strokeLinecap="round" fill="none" />
          {p.glasses
            ? GLASSES.map((d) => <Path key={d} d={d} stroke={colors.ink} strokeWidth={1.3} fill={colors.paper} fillOpacity={0.12} />)
            : null}
          {p.glasses ? <Path d="M49.5 45 L50.5 45" stroke={colors.ink} strokeWidth={1.3} /> : null}
          {p.beard ? <Path d={MUSTACHE} fill={p.hair} /> : null}
          <AnimatedPath animatedProps={mouth} fill={colors.mouth} />
        </AnimatedG>
        </G>
      </G>
    </Svg>
  );
}
