import type { ReactElement, ReactNode } from "react";
import { FlatList, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View, type ScrollViewProps } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/icon";
import { tabBarSpace } from "@/components/tab-bar";
import { usePullRefresh } from "@/hooks/use-pull-refresh";
import { colors, type } from "@/theme";

// A long list (History's sessions): rendered as a FlatList under the screen's content, so only what's on screen is
// mounted. The content above it scrolls with it as the list header.
type List<T> = { data: readonly T[]; render: (item: T, index: number) => ReactElement; keyOf: (item: T) => string };

type Props<T> = {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  scroll?: boolean;
  tabBar?: boolean; // leave room for the floating tab bar
  onRefresh?: () => Promise<unknown>; // pull down to reload (scroll screens)
  children?: ReactNode;
  list?: List<T>; // scroll screens only
};

const idle = async () => {};

export function Screen<T>({ title, subtitle, onBack, scroll, tabBar, onRefresh, children, list }: Props<T>) {
  const { bottom } = useSafeAreaInsets();
  const refresh = usePullRefresh(onRefresh ?? idle);
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

  const scrollProps: ScrollViewProps = {
    keyboardShouldPersistTaps: "handled", // buttons work on the first tap while the keyboard is up
    refreshControl: onRefresh ? refresh : undefined,
    contentContainerStyle: [styles.scroll, { paddingTop: onBack ? 0 : 14, paddingBottom: tabBar ? tabBarSpace(bottom) : 24 }],
  };

  const screen = (
    <SafeAreaView style={styles.safe} edges={tabBar ? ["top"] : ["top", "bottom"]}>
      {onBack ? (
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} style={styles.back}>
            <Icon name="arrow_back" size={24} />
          </Pressable>
        </View>
      ) : null}
      {scroll && list ? (
        <FlatList
          {...scrollProps}
          data={list.data}
          renderItem={({ item, index }) => list.render(item, index)}
          keyExtractor={list.keyOf}
          ListHeaderComponent={body}
          ItemSeparatorComponent={Gap}
        />
      ) : scroll ? (
        <ScrollView {...scrollProps}>{body}</ScrollView>
      ) : (
        <View style={[styles.fixed, { paddingTop: onBack ? 0 : 14 }]}>{body}</View>
      )}
    </SafeAreaView>
  );

  // Android draws edge to edge, so the window no longer shrinks for the keyboard: every scroll screen makes room
  // itself, so a focused field is never left under it.
  return scroll ? (
    <KeyboardAvoidingView behavior="padding" style={styles.flex}>
      {screen}
    </KeyboardAvoidingView>
  ) : (
    screen
  );
}

const Gap = () => <View style={styles.gap} />;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { height: 8 },
  safe: { flex: 1, backgroundColor: colors.paper },
  header: { height: 52, justifyContent: "center", paddingHorizontal: 10 },
  back: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  scroll: { paddingHorizontal: 20 },
  fixed: { flex: 1, paddingHorizontal: 22, paddingBottom: 24 },
  subtitle: { ...type.body, color: colors.inkMuted, marginTop: 8 },
});
