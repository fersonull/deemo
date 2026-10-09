import { Pressable, StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/icon";
import { colors, type } from "@/theme";

type Option<T> = { value: T; label: string; locked?: boolean };

type Props<T> = {
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  onLocked: () => void;
};

export function Segmented<T>({ label, options, value, onChange, onLocked }: Props<T>) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.track}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.label}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityHint={o.locked ? "Premium" : undefined}
            onPress={() => (o.locked ? onLocked() : onChange(o.value))}
            style={[styles.option, selected && styles.selected]}
          >
            <Text style={styles.text}>{o.label}</Text>
            {o.locked && <Icon name="lock" size={15} style={styles.lock} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: "row", backgroundColor: colors.sand, borderRadius: 16, padding: 4 },
  option: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  selected: {
    backgroundColor: colors.paper,
    elevation: 1,
    shadowColor: colors.ink,
    shadowOpacity: 0.12,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  text: { ...type.body, fontWeight: "500" },
  lock: { opacity: 0.6 },
});
