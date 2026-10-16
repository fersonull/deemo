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

import { PremiumBadge } from "@/components/deemo/badge";
import { colors, fonts } from "@/theme";
import { avatarUrl } from "@/utils/avatar";
import { initials } from "@/utils/initials";

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const SWEEP = Easing.bezier(0.77, 0, 0.175, 1); // the badge's glint curve

type Props = {
  seed: string | null;
  name: string | null;
  email?: string | null;
  size: number; // outer size, ring included, so a Premium avatar takes the same space
  premium?: boolean;
};

// A student's face (DiceBear, see utils/avatar.ts). The initials sit underneath, so they show while the image loads,
// before the account record arrives, offline, or if DiceBear is down. Premium students wear it in Deemo's medal ring,
// with Deemo's badge (the gold medal on its ribbon) pinned to the rim at the top right.
export function Avatar({ seed, name, email = null, size, premium }: Props) {
  const [failed, setFailed] = useState<string | null>(null); // the seed whose image failed
  const band = premium ? ringWidth(size) : 0;
  const face = size - 2 * band + (premium ? 1 : 0); // tucked half a pixel under the ring, so no seam shows
  const round = { width: face, height: face, borderRadius: face / 2 };
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
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
      {premium ? <PinnedBadge size={size} band={band} /> : null}
    </View>
  );
}

// Deemo's badge pinned on the ring at about half past one, overhanging the avatar's box (nothing clips it). The badge
// is drawn around (0, 0): medal r 9, ribbon tails down to y 16, its sparkle up to y -13 (viewBox below). The medal is
// about a third of the avatar wide: 14 px on a 42 px avatar, 38 px on the 112 px preview.
const VIEW = { x: -14, y: -14, w: 28, h: 31 };
function PinnedBadge({ size, band }: { size: number; band: number }) {
  const reduced = useReducedMotion();
  const w = size * 0.53;
  const h = (w * VIEW.h) / VIEW.w;
  const r = size / 2 - band / 2; // on the ring's middle
  const x = size / 2 + r * Math.cos(Math.PI / 4);
  const y = size / 2 - r * Math.sin(Math.PI / 4);
  return (
    <Svg
      width={w}
      height={h}
      viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`}
      style={{ position: "absolute", left: x - (w * -VIEW.x) / VIEW.w, top: y - (h * -VIEW.y) / VIEW.h }}
      pointerEvents="none"
    >
      <PremiumBadge cx={0} cy={0} still={reduced} />
    </Svg>
  );
}

// A thick band, like the medal's rim: 5 px on a 42 px avatar, 12 px on the 112 px preview.
const ringWidth = (size: number) => Math.max(4, Math.round(size * 0.105));

// Deemo's Premium medal (components/deemo/badge.tsx) as a ring: polished gold (light at the top left, deep gold at
// the bottom right), goldInk bevels at both edges and a goldLight hairline inside. Like the badge, a glint sweeps
// across it every 6–9 s (a timer, not a frame loop); the pinned badge has its own glint and sparkle. Reduce motion
// keeps it still. Rings in a row start at different times, so a group card never flashes in unison.
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

  // The band's shape, for clipping the glint: the outer circle minus the inner one.
  const circle = (r: number) => `M${c - r} ${c} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
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
    </Svg>
  );
}

const styles = StyleSheet.create({
  avatar: { backgroundColor: colors.duskTint, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  initials: { fontFamily: fonts.body, fontWeight: "600", color: colors.duskInk },
});
