import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";

import { Icon } from "@/components/icon";
import { colors, easeOut, type } from "@/theme";

type Option<T> = { value: T; label: string; locked?: boolean };

type Props<T> = {
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  onLocked: () => void;
};

const PAD = 4;

// A row of choices on a sand track. The paper thumb slides to the picked one (200 ms, ease-out), so the change
// reads as one control moving rather than two cells swapping. With reduce motion it jumps.
export function Segmented<T>({ label, options, value, onChange, onLocked }: Props<T>) {
  const [width, setWidth] = useState(0);
  const reduced = useReducedMotion();
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const cell = width ? (width - 2 * PAD) / options.length : 0;

  const x = useSharedValue(0);
  useEffect(() => {
    const to = index * cell;
    x.value = reduced || !cell ? to : withTiming(to, { duration: 200, easing: easeOut });
  }, [index, cell, reduced, x]);
  const sliding = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={styles.track}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      {cell ? <Animated.View style={[styles.thumb, { width: cell }, sliding]} /> : null}
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.label}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityHint={o.locked ? "Premium" : undefined}
            onPress={() => (o.locked ? onLocked() : onChange(o.value))}
            style={styles.option}
          >
            <Text style={[styles.text, selected && styles.textSelected]}>{o.label}</Text>
            {o.locked && <Icon name="lock" size={15} style={styles.lock} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: "row", backgroundColor: colors.sand, borderRadius: 16, padding: PAD },
  thumb: {
    position: "absolute",
    top: PAD,
    bottom: PAD,
    left: PAD,
    borderRadius: 12,
    backgroundColor: colors.paper,
    // A hairline instead of elevation: on Android elevation would draw the thumb over the labels.
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  option: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  text: { ...type.body, fontWeight: "500", color: colors.inkMuted },
  textSelected: { color: colors.ink, fontWeight: "600" },
  lock: { opacity: 0.6 },
});
