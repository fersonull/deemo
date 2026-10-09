import { router, type Tabs } from "expo-router";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Blob } from "@/components/blob";
import { Icon } from "@/components/icon";
import { colors, fonts } from "@/theme";

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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Start practice"
        onPress={() => router.push("/practice")}
        style={styles.practice}
      >
        {/* paper halo = the prototype's 6px box-shadow ring */}
        <Blob width={78} height={70} color={colors.paper}>
          <Blob width={66} height={58}>
            <Icon name="mic" size={28} color={colors.paper} filled />
          </Blob>
        </Blob>
      </Pressable>
      {state.routes.slice(2).map((r, i) => tab(r, i + 2))}
    </View>
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
  practice: { transform: [{ translateY: -14 }] },
});
