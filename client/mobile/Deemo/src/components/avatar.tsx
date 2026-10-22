import { useEffect, useId, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, ClipPath, Defs, G, LinearGradient, Path, Rect, Stop } from "react-native-svg";

// Faces and the medal are art: they keep the light palette in both themes.
import { fonts, light as colors } from "@/theme";
import { avatarUrl } from "@/utils/avatar";
import { initials } from "@/utils/initials";

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedPath = Animated.createAnimatedComponent(Path);
const SWEEP = Easing.bezier(0.77, 0, 0.175, 1); // the badge's glint curve

type Props = {
  seed: string | null;
  name: string | null;
  email?: string | null;
  size: number; // outer size, ring included, so a Premium avatar takes the same space
  premium?: boolean;
};

// A student's face (DiceBear, see utils/avatar.ts). The initials sit underneath, so they show while the image loads,
// before the account record arrives, offline, or if DiceBear is down. For Premium students the avatar is the body of
// Deemo's medal: the gold ring is its rim, and the medal's two ribbon tails hang behind it below.
export function Avatar({ seed, name, email = null, size, premium }: Props) {
  const [failed, setFailed] = useState<string | null>(null); // the seed whose image failed
  const band = premium ? ringWidth(size) : 0;
  const face = size - 2 * band + (premium ? 1 : 0); // tucked half a pixel under the ring, so no seam shows
  const round = { width: face, height: face, borderRadius: face / 2 };
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      {premium ? <RibbonTails size={size} /> : null}
      <View style={[styles.avatar, round]}>
        <Text style={[styles.initials, { fontSize: face * 0.36 }]}>{initials(name, email)}</Text>
        {seed && failed !== seed ? (
          <Image
            source={{ uri: avatarUrl(seed) }}
            onError={() => setFailed(seed)}
            style={[StyleSheet.absoluteFill, round]}
            accessibilityIgnoresInvertColors
          />
        ) : null}
      </View>
      {premium ? <MedalRing size={size} band={band} /> : null}
    </View>
  );
}

// The medal's ribbon tails (as on components/deemo/badge.tsx: a deep-gold tail and a gold one, each with a V cut),
// starting behind the avatar and hanging about a fifth of its size below it. They overhang the avatar's box (nothing
// clips them), so the medal keeps the avatar's layout size.
function RibbonTails({ size: s }: { size: number }) {
  const c = s / 2;
  const tail = (dir: 1 | -1) => {
    const x = (k: number) => c + dir * k * s;
    return `M${x(0.3)} ${c + 0.25 * s} L${x(0.37)} ${s + 0.2 * s} L${x(0.25)} ${s + 0.12 * s} L${x(0.15)} ${s + 0.24 * s} L${x(0.04)} ${c + 0.38 * s}Z`;
  };
  return (
    <Svg width={s} height={s * 1.3} style={{ position: "absolute", left: 0, top: 0 }} pointerEvents="none">
      <Path d={tail(-1)} fill={colors.goldInk} />
      <Path d={tail(1)} fill={colors.gold} />
    </Svg>
  );
}

// A thick band, like the medal's rim: 5 px on a 42 px avatar, 12 px on the 112 px preview.
const ringWidth = (size: number) => Math.max(4, Math.round(size * 0.105));

// Deemo's Premium medal (components/deemo/badge.tsx) as a ring: polished gold (light at the top left, deep gold at
// the bottom right), goldInk bevels at both edges and a goldLight hairline inside. Like the badge, a glint sweeps
// across it every 6–9 s (a timer, not a frame loop) and a small sparkle flares at the rim; reduce motion keeps it
// still. Rings in a row start at different times, so a group card never flashes in unison.
function MedalRing({ size, band }: { size: number; band: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const reduced = useReducedMotion();
  const shine = useSharedValue(0);
  const c = size / 2;
  const outer = c - 0.5;
  const inner = c - band;

  useEffect(() => {
    if (reduced) return;
    let t: ReturnType<typeof setTimeout>;
    const next = (wait: number) => {
      t = setTimeout(() => {
        shine.value = withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: 800, easing: SWEEP }));
        next(6000 + Math.random() * 3000);
      }, wait);
    };
    next(800 + Math.random() * 2500);
    return () => clearTimeout(t);
  }, [shine, reduced]);

  const glint = useAnimatedProps(() => ({
    x: -size * 0.4 + size * 1.8 * shine.value,
    opacity: shine.value > 0 && shine.value < 1 ? 1 : 0,
  }));
  const sparkle = useAnimatedProps(() => ({ opacity: Math.max(0, 1 - Math.abs(shine.value - 0.7) * 5) }));

  // The band's shape, for clipping the glint: the outer circle minus the inner one.
  const circle = (r: number) => `M${c - r} ${c} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
  // A four-point sparkle on the rim at the top right (about 1–2 o'clock), scaled with the band.
  const sx = c + (c - band / 2) * Math.cos(-Math.PI / 4);
  const sy = c + (c - band / 2) * Math.sin(-Math.PI / 4);
  const k = Math.max(3, band * 0.9);
  const star = `M${sx} ${sy - k} Q${sx + k * 0.15} ${sy - k * 0.15} ${sx + k} ${sy} Q${sx + k * 0.15} ${sy + k * 0.15} ${sx} ${sy + k} Q${sx - k * 0.15} ${sy + k * 0.15} ${sx - k} ${sy} Q${sx - k * 0.15} ${sy - k * 0.15} ${sx} ${sy - k}Z`;

  return (
    <Svg width={size} height={size} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <LinearGradient id={`gold${id}`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors.goldLight} />
          <Stop offset="0.35" stopColor={colors.gold} />
          <Stop offset="0.75" stopColor={colors.goldInk} />
          <Stop offset="1" stopColor={colors.gold} />
        </LinearGradient>
        {/* the glint: soft at both sides, brightest in the middle, like light across polished metal */}
        <LinearGradient id={`shine${id}`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={colors.paper} stopOpacity={0} />
          <Stop offset="0.5" stopColor={colors.paper} stopOpacity={0.95} />
          <Stop offset="1" stopColor={colors.paper} stopOpacity={0} />
        </LinearGradient>
        <ClipPath id={`band${id}`}>
          <Path d={`${circle(outer)} ${circle(inner)}`} fillRule="evenodd" clipRule="evenodd" />
        </ClipPath>
      </Defs>
      {/* the band, then its bevels: goldInk at both edges, a goldLight hairline just inside the outer one */}
      <Circle cx={c} cy={c} r={(outer + inner) / 2} stroke={`url(#gold${id})`} strokeWidth={outer - inner} fill="none" />
      <Circle cx={c} cy={c} r={outer} stroke={colors.goldInk} strokeWidth={1} fill="none" />
      <Circle cx={c} cy={c} r={outer - 1.5} stroke={colors.goldLight} strokeWidth={1} fill="none" opacity={0.7} />
      <Circle cx={c} cy={c} r={inner + 0.5} stroke={colors.goldInk} strokeWidth={1} fill="none" />
      {/* the glint, clipped to the band */}
      <G clipPath={`url(#band${id})`}>
        <G rotation={25} origin={`${c}, ${c}`}>
          <AnimatedRect
            animatedProps={glint}
            y={-size * 0.2}
            width={Math.max(8, band * 2)}
            height={size * 1.4}
            fill={`url(#shine${id})`}
            opacity={0}
          />
        </G>
      </G>
      <AnimatedPath animatedProps={sparkle} d={star} fill={colors.paper} opacity={0} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  avatar: { backgroundColor: colors.duskTint, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  initials: { fontFamily: fonts.body, fontWeight: "600", color: colors.duskInk },
});
