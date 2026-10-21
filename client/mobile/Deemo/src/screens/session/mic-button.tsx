import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { Blob } from "@/components/blob";
import { Icon } from "@/components/icon";
import { colors } from "@/theme";
import { PressableScale } from "@/components/pressable-scale";

const WAVE = [0.6, 1, 0.75, 0.5, 0.9];

type Props = { active: boolean; muted: boolean; level: number; label: string; onPress: () => void };

// Primary control: tap when you're done answering. The ring and wave follow the mic level.
export function MicButton({ active, muted, level, label, onPress }: Props) {
  const lvl = useSharedValue(0);
  useEffect(() => {
    lvl.value = withTiming(active ? level : 0, { duration: 150 });
  }, [active, level, lvl]);
  const ring = useAnimatedStyle(() => ({ transform: [{ scale: 1.08 + lvl.value * 0.3 }], opacity: active ? 0.5 : 0 }));

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !active }}
      disabled={!active}
      onPress={onPress}
      hitSlop={8}
    >
      <View style={[styles.wrap, !active && styles.dim]}>
        <Animated.View style={[StyleSheet.absoluteFill, ring]}>
          <Blob width={96} height={84} color={colors.duskTint} />
        </Animated.View>
        <Blob width={96} height={84} style={active ? styles.raised : undefined}>
          {active ? (
            <View style={styles.wave}>
              {WAVE.map((k, i) => (
                <View key={i} style={[styles.bar, { height: 8 + level * 24 * k }]} />
              ))}
            </View>
          ) : (
            <Icon name={muted ? "mic_off" : "mic"} size={32} color={colors.paper} filled />
          )}
        </Blob>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  // Lit like the app's other main actions: a faint top highlight and glow inside the blob, no lower layer.
  raised: {
    boxShadow: [
      { inset: true, offsetX: 0, offsetY: 1, blurRadius: 0, color: "rgba(255,255,255,0.22)" },
      { inset: true, offsetX: 0, offsetY: 12, blurRadius: 20, spreadDistance: -10, color: "rgba(255,255,255,0.1)" },
    ],
  },
  wrap: { width: 96, height: 84 },
  dim: { opacity: 0.4 },
  wave: { flexDirection: "row", alignItems: "center", gap: 4 },
  bar: { width: 5, borderRadius: 3, backgroundColor: colors.paper },
});
