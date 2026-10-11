import { useEffect } from "react";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { Blob } from "@/components/blob";
import { colors, easeOut, fonts } from "@/theme";

export type DeemoMood = "idle" | "cheering" | "reading" | "encouraging" | "waving" | "sleepy";

// L: onboarding hero. M: cards, empty states, waits. S: inline notes (no cheeks).
const WIDTH = { l: 136, m: 76, s: 40 } as const;

type Props = {
  mood?: DeemoMood;
  size?: keyof typeof WIDTH;
  look?: "left" | "right"; // pupils drift toward the speech bubble
  style?: ViewStyle;
};

// Deemo, the app's guide (design D1–D5): the brand pebble in solid dusk with paper eyes, soft cheeks, a small
// smile and round glasses pushed up on its head. Flat fills only, every measure a fraction of the width, so one
// drawing serves all three sizes. The body holds still; only the face and gestures move, and with reduce motion
// everything holds still and the mood reads from shape. Decorative: screen readers read the words beside it.
export function Deemo({ mood = "idle", size = "m", look, style }: Props) {
  const w = WIDTH[size];
  const h = Math.round(w * 0.853);
  const top = Math.round(w * 0.16); // room for the glasses above the head
  const reduced = useReducedMotion();
  const u = (f: number) => f * w;
  const stroke = Math.max(1.5, u(0.032));

  // Blink every 4–7 s (randomized), 120 ms. Only open eyes blink.
  const lid = useSharedValue(1);
  const opensEyes = mood !== "cheering" && mood !== "sleepy";
  useEffect(() => {
    if (reduced || !opensEyes) return;
    let t: ReturnType<typeof setTimeout>;
    const next = () => {
      t = setTimeout(() => {
        lid.value = withSequence(withTiming(0.1, { duration: 60 }), withTiming(1, { duration: 60 }));
        next();
      }, 4000 + Math.random() * 3000);
    };
    next();
    return () => clearTimeout(t);
  }, [lid, opensEyes, reduced]);

  // Cheer: one 300 ms hop, then still; the glasses perk up with it.
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
  const blinking = useAnimatedStyle(() => ({ transform: [{ scaleY: lid.value }] }));
  const shift = u(0.022); // plain number: worklets can't call u()
  const pupil = useAnimatedStyle(() => ({ transform: [{ translateX: gaze.value * shift }] }));
  const rocking = useAnimatedStyle(() => ({ transform: [{ rotate: `${wave.value}deg` }] }));

  // Face positions, relative to the body box.
  const eyeW = u(0.14);
  const eyeH = u(0.18);
  const eyeY = h * 0.4;
  const eyeDX = u(0.135);
  const mouthY = h * 0.6;
  const tilt = mood === "encouraging" ? -8 : 0;

  // Glasses sit on top of the head like a pair pushed up from the eyes; the mood moves them as it moved the sprout.
  const lens = u(0.22);
  const bridge = u(0.06);
  const glasses =
    mood === "cheering"
      ? { lift: -u(0.03), rotate: 0 }
      : mood === "sleepy"
        ? { lift: u(0.1), rotate: -14 }
        : { lift: 0, rotate: -6 };

  const arc = (width: number, open: "up" | "down"): ViewStyle => ({
    position: "absolute",
    width,
    height: width,
    borderRadius: width / 2,
    borderWidth: stroke,
    borderColor: "transparent",
    ...(open === "up" ? { borderBottomColor: colors.paper } : { borderTopColor: colors.paper }),
  });

  return (
    <View
      style={[{ width: w, height: h + top, transform: [{ rotate: `${tilt}deg` }] }, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
    >
      <Animated.View style={[StyleSheet.absoluteFill, hopping]}>
        <View style={{ position: "absolute", top, left: 0 }}>
          <Blob width={w} height={h} />
        </View>

        <View style={{ position: "absolute", top, left: 0, width: w, height: h }}>
          {/* Eyes */}
          {[-1, 1].map((side) => {
            const cx = w / 2 + side * eyeDX;
            if (mood === "cheering") {
              const aw = eyeW * 1.15;
              return <View key={side} style={[arc(aw, "down"), { left: cx - aw / 2, top: eyeY - aw * 0.3 }]} />;
            }
            if (mood === "sleepy") {
              return (
                <View
                  key={side}
                  style={{
                    position: "absolute",
                    left: cx - eyeW / 2,
                    top: eyeY + eyeH * 0.15,
                    width: eyeW,
                    height: stroke,
                    borderRadius: stroke,
                    backgroundColor: colors.paper,
                  }}
                />
              );
            }
            const pupilD = u(0.075);
            const down = mood === "reading" ? eyeH * 0.12 : 0;
            return (
              <Animated.View
                key={side}
                style={[
                  {
                    position: "absolute",
                    left: cx - eyeW / 2,
                    top: eyeY - eyeH / 2,
                    width: eyeW,
                    height: eyeH,
                    borderRadius: eyeW / 2,
                    backgroundColor: colors.paper,
                    alignItems: "center",
                    paddingTop: eyeH * 0.42 + down,
                  },
                  blinking,
                ]}
              >
                <Animated.View
                  style={[
                    { width: pupilD, height: pupilD, borderRadius: pupilD / 2, backgroundColor: colors.duskInk },
                    pupil,
                  ]}
                />
              </Animated.View>
            );
          })}

          {/* Cheeks (not at S) */}
          {size !== "s"
            ? [-1, 1].map((side) => (
                <View
                  key={side}
                  style={{
                    position: "absolute",
                    left: w / 2 + side * u(0.25) - u(0.06),
                    top: mouthY - u(0.045),
                    width: u(0.12),
                    height: u(0.06),
                    borderRadius: u(0.03),
                    backgroundColor: colors.duskTint,
                    opacity: 0.55,
                  }}
                />
              ))
            : null}

          {/* Mouth */}
          {mood === "cheering" ? (
            <View
              style={{
                position: "absolute",
                left: w / 2 - u(0.08),
                top: mouthY - u(0.03),
                width: u(0.16),
                height: u(0.08),
                borderBottomLeftRadius: u(0.08),
                borderBottomRightRadius: u(0.08),
                backgroundColor: colors.paper,
              }}
            />
          ) : mood === "sleepy" ? (
            <View
              style={{
                position: "absolute",
                left: w / 2 - u(0.035),
                top: mouthY,
                width: u(0.07),
                height: stroke,
                borderRadius: stroke,
                backgroundColor: colors.paper,
              }}
            />
          ) : (
            <View style={[arc(u(0.16), "up"), { left: w / 2 - u(0.08), top: mouthY - u(0.13) }]} />
          )}

          {/* Reading: a page held in front */}
          {mood === "reading" ? (
            <View
              style={{
                position: "absolute",
                left: w / 2 - u(0.18),
                top: h - u(0.2),
                width: u(0.36),
                height: u(0.22),
                borderRadius: Math.max(2, u(0.03)),
                backgroundColor: colors.paper,
                padding: u(0.04),
                gap: u(0.025),
                transform: [{ rotate: "-6deg" }],
              }}
            >
              {[0.85, 1, 0.6].map((f, i) => (
                <View key={i} style={{ width: `${f * 100}%`, height: stroke, borderRadius: stroke, backgroundColor: colors.duskSoft }} />
              ))}
            </View>
          ) : null}
        </View>

        {/* Glasses */}
        <View
          style={{
            position: "absolute",
            left: w / 2 - lens - bridge / 2,
            top: top - lens * 0.62 + glasses.lift,
            flexDirection: "row",
            alignItems: "center",
            transform: [{ rotate: `${glasses.rotate}deg` }],
          }}
        >
          <View style={[styles.lens, { width: lens, height: lens, borderRadius: lens / 2, borderWidth: stroke }]} />
          <View style={{ width: bridge, height: stroke, backgroundColor: colors.duskInk }} />
          <View style={[styles.lens, { width: lens, height: lens, borderRadius: lens / 2, borderWidth: stroke }]} />
        </View>

        {/* Waving: a little pebble hand */}
        {mood === "waving" ? (
          <Animated.View
            style={[
              {
                position: "absolute",
                left: w * 0.9,
                top: top + h * 0.02,
                transformOrigin: "left bottom",
              },
              rocking,
            ]}
          >
            <Blob width={u(0.2)} height={u(0.17)} />
          </Animated.View>
        ) : null}
      </Animated.View>

      {/* Cheering: a few sparks. Sleepy: z z. */}
      {mood === "cheering"
        ? [
            [-0.06, 0.45, 0.05],
            [1.0, 0.3, 0.04],
            [1.04, 0.62, 0.035],
          ].map(([x, y, d], i) => (
            <View
              key={i}
              style={{
                position: "absolute",
                left: w * x,
                top: top + h * y,
                width: u(d),
                height: u(d),
                borderRadius: u(d) / 2,
                backgroundColor: colors.duskSoft,
              }}
            />
          ))
        : null}
      {mood === "sleepy" ? (
        <>
          <Text style={[styles.z, { left: w * 0.92, top: top - u(0.12), fontSize: Math.max(9, u(0.17)) }]}>z</Text>
          <Text style={[styles.z, { left: w * 1.04, top: top + u(0.06), fontSize: Math.max(7, u(0.11)) }]}>z</Text>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  lens: { borderColor: colors.duskInk },
  z: { position: "absolute", fontFamily: fonts.display, fontWeight: "800", color: colors.duskInk },
});
