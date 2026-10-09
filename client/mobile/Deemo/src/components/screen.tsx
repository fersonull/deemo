import type { ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, type } from "@/theme";

type Props = {
  title?: string;
  subtitle?: string;
  scroll?: boolean; // tab screens scroll and leave room for the floating tab bar
  children?: ReactNode;
};

export function Screen({ title, subtitle, scroll, children }: Props) {
  const header = title ? (
    <>
      <Text accessibilityRole="header" style={type.hero}>
        {title}
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </>
  ) : null;

  return (
    <SafeAreaView style={styles.safe} edges={scroll ? ["top"] : ["top", "bottom"]}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scroll}>
          {header}
          {children}
        </ScrollView>
      ) : (
        <View style={styles.fixed}>
          {header}
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  scroll: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 120 },
  fixed: { flex: 1, paddingHorizontal: 22, paddingTop: 14, paddingBottom: 24 },
  subtitle: { ...type.body, color: colors.inkMuted, marginTop: 8 },
});
