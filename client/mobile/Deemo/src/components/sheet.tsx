import { useEffect, useState, type ReactNode } from "react";
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";

import { colors } from "@/theme";

type Props = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
};

// Bottom sheet from the prototype: the backdrop fades while the card slides up from the bottom
// (and back down on close). Reanimated skips the motion when the system reduces it.
export function Sheet({ visible, onClose, children }: Props) {
  const { bottom } = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(0);
  const cardHeight = useSharedValue(height);

  // Stay mounted until the close animation finishes; a Modal would vanish instantly.
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (visible) {
      progress.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) });
    } else {
      progress.value = withTiming(0, { duration: 220, easing: Easing.in(Easing.cubic) }, (done) => {
        if (done) scheduleOnRN(setMounted, false);
      });
    }
  }, [visible, progress]);

  const backdrop = useAnimatedStyle(() => ({ opacity: progress.value }));
  const card = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - progress.value) * cardHeight.value }] }));

  return (
    <Modal visible={mounted} transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdrop]}>
        <Pressable accessibilityLabel="Close" style={styles.flex} onPress={onClose} />
      </Animated.View>
      <View style={styles.flex} pointerEvents="box-none" />
      <Animated.View
        style={[styles.card, { paddingBottom: 26 + bottom }, card]}
        onLayout={(e) => (cardHeight.value = e.nativeEvent.layout.height)}
      >
        <View style={styles.grabber} />
        {children}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { backgroundColor: "rgba(42,36,32,0.35)" },
  card: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 12,
    paddingHorizontal: 22,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(42,36,32,0.2)",
    alignSelf: "center",
    marginBottom: 18,
  },
});
