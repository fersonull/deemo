import { router, type Tabs } from "expo-router";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Blob } from "@/components/blob";
import { Icon } from "@/components/icon";
import { useProjects } from "@/hooks/use-projects";
import { useSessions } from "@/hooks/use-sessions";
import { colors, easeOut, fonts } from "@/theme";

type Props = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

const ICONS: Record<string, string> = {
  index: "home",
  projects: "folder",
  history: "monitoring",
  profile: "person",
};

// Floating dark pill with Practice raised in the middle (design brief: Practice is the main action).
export function TabBar({ state, descriptors, navigation }: Props) {
  const { bottom } = useSafeAreaInsets();
  const sessionsDown = useSessions().error;
  const projectsDown = useProjects().error;

  // When the current tab is showing the full-screen offline state (components/offline.tsx), the bar steps aside so
  // only the offline notice is visible. Profile has no offline state, so it keeps the bar.
  const current = state.routes[state.index]?.name;
  const offline =
    ((current === "index" || current === "history") && sessionsDown) || (current === "projects" && projectsDown);
  if (offline) return null;

  const tab = (route: (typeof state.routes)[number], index: number) => {
    const focused = state.index === index;
    const color = focused ? colors.paper : "rgba(247,243,236,0.55)";
    const label = descriptors[route.key].options.title ?? route.name;
    return (
      <Pressable
        key={route.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={label}
        style={styles.tab}
        onPress={() => {
          const e = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!focused && !e.defaultPrevented) navigation.navigate(route.name);
        }}
      >
        <Icon name={ICONS[route.name]} size={23} color={color} filled={focused} />
        <Text style={[styles.label, { color }]}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.bar, { bottom: 12 + bottom }]}>
      {state.routes.slice(0, 2).map((r, i) => tab(r, i))}
      <PracticeButton />
      {state.routes.slice(2).map((r, i) => tab(r, i + 2))}
    </View>
  );
}

// Practice, raised above the row. A press makes it glow like the mic in a session: a soft dusk halo swells out
// behind it (120 ms in, 260 ms out). With reduce motion the halo only fades.
function PracticeButton() {
  const reduced = useReducedMotion();
  const glow = useSharedValue(0);
  const halo = useAnimatedStyle(() => ({
    opacity: 0.75 * glow.value,
    transform: [{ scale: reduced ? 1.15 : 1 + 0.22 * glow.value }],
  }));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Start practice"
      onPress={() => router.push("/practice")}
      onPressIn={() => glow.set(withTiming(1, { duration: 120, easing: easeOut }))}
      onPressOut={() => glow.set(withTiming(0, { duration: 260, easing: easeOut }))}
      style={styles.practice}
    >
      <Animated.View style={[StyleSheet.absoluteFill, styles.center, halo]}>
        <Blob width={78} height={70} color={colors.duskSoft} />
      </Animated.View>
      {/* paper halo = the prototype's 6px box-shadow ring */}
      <Blob width={78} height={70} color={colors.paper}>
        <Blob width={66} height={58}>
          <Icon name="mic" size={28} color={colors.paper} filled />
        </Blob>
      </Blob>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 12,
    right: 12,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.ink,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 8,
  },
  tab: { width: 56, height: 56, alignItems: "center", justifyContent: "center", gap: 2 },
  label: { fontFamily: fonts.body, fontWeight: "500", fontSize: 10 },
  // Raised well above the row, so Practice reads as the main action rather than a fifth tab.
  practice: { transform: [{ translateY: -26 }] },
  center: { alignItems: "center", justifyContent: "center" },
});
