import type { ReactNode } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "@/theme";

type Props = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
};

// Bottom sheet from the prototype: dimmed backdrop, paper card with a grabber.
export function Sheet({ visible, onClose, children }: Props) {
  const { bottom } = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <Pressable accessibilityLabel="Close" style={styles.backdrop} onPress={onClose} />
      <View style={[styles.card, { paddingBottom: 26 + bottom }]}>
        <View style={styles.grabber} />
        {children}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(42,36,32,0.35)" },
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
