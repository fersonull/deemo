import { PressableScale } from "@/components/pressable-scale";
import { LinearGradient } from "expo-linear-gradient";
import { router, type Tabs } from "expo-router";
import type { ComponentProps } from "react";
import { StyleSheet, Text } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";

import { Blob } from "@/components/blob";
import { Icon } from "@/components/icon";
import { useProjects } from "@/hooks/use-projects";
import { useSessions } from "@/hooks/use-sessions";
import { colors, easeOut, fonts } from "@/theme";

type Props = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

const BAR = 70;
const FADE = 48; // how far above the bar the content starts to fade

// Bottom padding for a tab's scrolling content, so its last row can scroll fully clear of the bar and its fade.
export const tabBarSpace = (bottomInset: number) => FADE + BAR + 12 + bottomInset;

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
    const color = focused ? colors.paper : colors.paperDim;
    const label = descriptors[route.key].options.title ?? route.name;
    return (
      <PressableScale
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
      </PressableScale>
    );
  };

  // Content scrolling under the floating bar fades into the paper instead of being cut off by it: clear above, mostly
  // paper by the bar's top edge, solid paper behind the bar and the gesture area. Touches pass through.
  const fadeHeight = tabBarSpace(bottom);
  return (
    <>
      <Animated.View pointerEvents="none" style={[styles.fade, { height: fadeHeight }]}>
        <LinearGradient
          pointerEvents="none"
          colors={[`${colors.paper}00`, `${colors.paper}D9`, colors.paper]}
          locations={[0, FADE / fadeHeight, 1]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Animated.View style={[styles.bar, { bottom: 12 + bottom }]}>
        {state.routes.slice(0, 2).map((r, i) => tab(r, i))}
        <PracticeButton />
        {state.routes.slice(2).map((r, i) => tab(r, i + 2))}
      </Animated.View>
    </>
  );
}

const GLOW = 132; // the glow's diameter, well past the button so its edge fades out over the bar and the page

// Practice, raised above the row. A press makes it glow like the mic in a session: a soft dusk light swells out
// behind it and fades to nothing at its edge, the same smooth falloff as the fade above the bar (a radial gradient,
// no hard rim). Quick in (120 ms), slow out (450 ms). With reduce motion the glow only fades.
function PracticeButton() {
  const reduced = useReducedMotion();
  const glow = useSharedValue(0);
  const halo = useAnimatedStyle(() => ({
    opacity: glow.value,
    transform: [{ scale: reduced ? 1 : 0.8 + 0.25 * glow.value }],
  }));
  return (
    <PressableScale
      layered={false}
      accessibilityRole="button"
      accessibilityLabel="Start practice"
      onPress={() => router.push("/practice")}
      onPressIn={() => glow.set(withTiming(1, { duration: 120, easing: easeOut }))}
      onPressOut={() => glow.set(withTiming(0, { duration: 450, easing: easeOut }))}
      style={styles.practice}
    >
      <Animated.View pointerEvents="none" style={[styles.glow, halo]}>
        <Svg width={GLOW} height={GLOW}>
          <Defs>
            <RadialGradient id="practiceGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0.35" stopColor={colors.dusk} stopOpacity={0.7} />
              <Stop offset="0.6" stopColor={colors.duskSoft} stopOpacity={0.45} />
              <Stop offset="1" stopColor={colors.duskSoft} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={GLOW / 2} cy={GLOW / 2} r={GLOW / 2} fill="url(#practiceGlow)" />
        </Svg>
      </Animated.View>
      {/* paper halo = the prototype's 6px box-shadow ring */}
      <Blob width={78} height={70} color={colors.paper}>
        <Blob width={66} height={58}>
          <Icon name="mic" size={28} color={colors.paper} filled />
        </Blob>
      </Blob>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  fade: { position: "absolute", left: 0, right: 0, bottom: 0 },
  bar: {
    position: "absolute",
    left: 12,
    right: 12,
    height: BAR,
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
  // Centered on the button and larger than it; the button's own box doesn't clip it.
  glow: { position: "absolute", width: GLOW, height: GLOW, left: (78 - GLOW) / 2, top: (70 - GLOW) / 2 },
});
