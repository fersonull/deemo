import { useState } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";

import { Deemo } from "@/components/deemo";
import { Icon } from "@/components/icon";
import { PressableScale } from "@/components/pressable-scale";
import { tabBarSpace } from "@/components/tab-bar";
import { colors, radius, type } from "@/theme";

const SIZE = 60;
const EDGE = 10;
const GAP = 8;
const TARGET = 64; // the dismiss circle
const spring = { damping: 18, stiffness: 180 };

type Props = { title: string; unread: number; onOpen: () => void; onDismiss: () => void };

// A new notice as Deemo floating at the edge of the screen with the notice's title in a speech bubble, like a chat
// head. Tap Deemo or the bubble to read the full message; drag Deemo to either side and it snaps there; drop it on
// the × that appears at the bottom to dismiss. Screen readers get "open" and "dismiss" actions instead of the drag.
export function FloatingNotice({ title, unread, onOpen, onDismiss }: Props) {
  const { width, height } = useWindowDimensions();
  const { top, bottom } = useSafeAreaInsets();
  const minY = top + 64;
  const maxY = height - tabBarSpace(bottom) - SIZE;
  const target = { x: width / 2, y: height - bottom - 56 - TARGET / 2 };

  const [side, setSide] = useState<"left" | "right">("right");
  const x = useSharedValue(width - EDGE - SIZE);
  const y = useSharedValue(top + 120);
  const from = useSharedValue({ x: 0, y: 0 });
  const dragging = useSharedValue(0);
  const over = useSharedValue(0);
  const bubbleW = useSharedValue(0);

  const pan = Gesture.Pan()
    .onStart(() => {
      from.value = { x: x.value, y: y.value };
      dragging.value = withTiming(1, { duration: 150 });
    })
    .onUpdate((e) => {
      x.value = from.value.x + e.translationX;
      y.value = from.value.y + e.translationY;
      const near = Math.hypot(x.value + SIZE / 2 - target.x, y.value + SIZE / 2 - target.y) < TARGET;
      over.value = withTiming(near ? 1 : 0, { duration: 120 });
    })
    .onEnd((e) => {
      dragging.value = withTiming(0, { duration: 150 });
      if (over.value > 0.5) {
        x.value = withTiming(target.x - SIZE / 2, { duration: 120 });
        y.value = withTiming(target.y - SIZE / 2, { duration: 120 }, () => scheduleOnRN(onDismiss));
        return;
      }
      // Fling-aware snap to the nearer side, kept between the header and the tab bar.
      const right = x.value + SIZE / 2 + e.velocityX * 0.15 > width / 2;
      x.value = withSpring(right ? width - EDGE - SIZE : EDGE, { ...spring, velocity: e.velocityX });
      y.value = withSpring(Math.min(maxY, Math.max(minY, y.value + e.velocityY * 0.08)), spring);
      scheduleOnRN(setSide, right ? "right" : "left");
    });
  const tap = Gesture.Tap().onEnd(() => scheduleOnRN(onOpen));
  const gesture = Gesture.Exclusive(pan, tap);

  const owlStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { scale: 1 + dragging.value * 0.08 - over.value * 0.15 }],
  }));
  // The bubble sits on the screen side of Deemo and steps aside while it's being dragged.
  const bubbleStyle = useAnimatedStyle(() => ({
    opacity: 1 - dragging.value,
    transform: [
      { translateX: side === "right" ? x.value - GAP - bubbleW.value : x.value + SIZE + GAP },
      { translateY: y.value + SIZE / 2 - 20 },
      { scale: 1 - dragging.value * 0.1 },
    ],
  }));
  const targetStyle = useAnimatedStyle(() => ({
    opacity: dragging.value,
    transform: [{ scale: 0.8 + dragging.value * 0.2 + over.value * 0.2 }],
  }));

  return (
    <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(160)} style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[styles.target, { left: target.x - TARGET / 2, top: target.y - TARGET / 2 }, targetStyle]} pointerEvents="none">
        <Icon name="close" size={28} color={colors.paper} />
      </Animated.View>

      <Animated.View style={[styles.bubbleWrap, bubbleStyle]} onLayout={(e) => (bubbleW.value = e.nativeEvent.layout.width)}>
        <PressableScale
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          onPress={onOpen}
          style={[styles.bubble, { maxWidth: Math.min(240, width - SIZE - EDGE * 2 - GAP - 24) }]}
        >
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          <View style={[styles.tail, side === "right" ? styles.tailRight : styles.tailLeft]} />
        </PressableScale>
      </Animated.View>

      <GestureDetector gesture={gesture}>
        <Animated.View
          accessible
          accessibilityRole="button"
          accessibilityLabel={`Notice from DEEMO: ${title}`}
          accessibilityHint="Opens the full message"
          accessibilityActions={[{ name: "activate" }, { name: "dismiss", label: "Dismiss notice" }]}
          onAccessibilityAction={(e) => (e.nativeEvent.actionName === "dismiss" ? onDismiss() : onOpen())}
          style={[styles.owl, owlStyle]}
        >
          <Deemo size="s" mood="waving" look={side === "right" ? "left" : "right"} />
          {unread > 1 ? (
            <View style={styles.count}>
              <Text style={styles.countText}>{unread > 9 ? "9+" : unread}</Text>
            </View>
          ) : null}
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  owl: {
    position: "absolute",
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: colors.duskTint,
    borderWidth: 2.5,
    borderColor: colors.paper,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 6px 18px rgba(42, 36, 32, 0.25)",
  },
  count: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.dusk,
    borderWidth: 2,
    borderColor: colors.paper,
  },
  countText: { ...type.label, fontSize: 11, letterSpacing: 0, color: colors.paper },
  bubbleWrap: { position: "absolute", left: 0, top: 0 },
  bubble: {
    height: 40,
    justifyContent: "center",
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
    boxShadow: "0 6px 18px rgba(42, 36, 32, 0.22)",
  },
  title: { ...type.bodyStrong, fontSize: 14, color: colors.paper },
  tail: { position: "absolute", top: 14, width: 12, height: 12, backgroundColor: colors.ink, transform: [{ rotate: "45deg" }] },
  tailRight: { right: -4 },
  tailLeft: { left: -4 },
  target: {
    position: "absolute",
    width: TARGET,
    height: TARGET,
    borderRadius: TARGET / 2,
    backgroundColor: "rgba(42, 36, 32, 0.78)",
    alignItems: "center",
    justifyContent: "center",
  },
});
