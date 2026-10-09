import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Icon } from "@/components/icon";
import { colors, type } from "@/theme";

type Props = {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  scroll?: boolean;
  tabBar?: boolean; // leave room for the floating tab bar
  children?: ReactNode;
};

export function Screen({ title, subtitle, onBack, scroll, tabBar, children }: Props) {
  const body = (
    <>
      {title ? (
        <Text accessibilityRole="header" style={type.hero}>
          {title}
        </Text>
      ) : null}
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {children}
    </>
  );

  return (
    <SafeAreaView style={styles.safe} edges={tabBar ? ["top"] : ["top", "bottom"]}>
      {onBack ? (
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} style={styles.back}>
            <Icon name="arrow_back" size={24} />
          </Pressable>
        </View>
      ) : null}
      {scroll ? (
        <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: onBack ? 0 : 14, paddingBottom: tabBar ? 120 : 24 }]}>
          {body}
        </ScrollView>
      ) : (
        <View style={[styles.fixed, { paddingTop: onBack ? 0 : 14 }]}>{body}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  header: { height: 52, justifyContent: "center", paddingHorizontal: 10 },
  back: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  scroll: { paddingHorizontal: 20 },
  fixed: { flex: 1, paddingHorizontal: 22, paddingBottom: 24 },
  subtitle: { ...type.body, color: colors.inkMuted, marginTop: 8 },
});
