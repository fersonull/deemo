import { router } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";

import { Blob } from "@/components/blob";
import { Icon } from "@/components/icon";
import { Screen } from "@/components/screen";
import { colors, type } from "@/theme";

function greeting(hour: number) {
  if (hour < 12) return "Morning.";
  if (hour < 18) return "Afternoon.";
  return "Evening.";
}

export default function Home() {
  return (
    <Screen scroll title={greeting(new Date().getHours())} subtitle="Up for a round with the panel?">
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push("/practice")}
        style={({ pressed }) => [styles.start, pressed && styles.pressed]}
      >
        <Text style={[type.button, styles.startLabel]}>Start practice</Text>
        <Blob width={44} height={44}>
          <Icon name="mic" size={22} color={colors.paper} filled />
        </Blob>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  start: {
    height: 60,
    marginTop: 18,
    borderRadius: 30,
    backgroundColor: colors.ink,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingLeft: 22,
    paddingRight: 8,
  },
  startLabel: { flex: 1, color: colors.paper },
  pressed: { opacity: 0.85 },
});
