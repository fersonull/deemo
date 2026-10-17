import { getAuth } from "@react-native-firebase/auth";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import { PressableScale } from "@/components/pressable-scale";
import { Screen } from "@/components/screen";
import { notices, useNotices } from "@/hooks/use-notices";
import { colors, radius, type } from "@/theme";

export function Notices() {
  const state = useNotices();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [expanded, setExpanded] = useState<string | undefined>(id);
  const [readError, setReadError] = useState("");
  useEffect(() => { void notices.refresh(); }, []);
  useEffect(() => {
    if (id) void notices.read(id).catch(() => setReadError("Couldn't mark this notice as read. Tap it to try again."));
  }, [id]);
  const read = async (noticeId: string) => {
    setReadError("");
    try { await notices.read(noticeId); }
    catch { setReadError("Couldn't mark this notice as read. Tap it to try again."); }
  };
  if (state.owner !== getAuth().currentUser?.uid) return null;

  return (
    <Screen title="Your inbox" subtitle="Updates and messages from DEEMO." onBack={() => router.back()}>
      <Text style={styles.count}>{state.unread ? `${state.unread} unread` : "You're all caught up"}</Text>
      {readError ? <Text accessibilityRole="alert" style={styles.error}>{readError}</Text> : null}
      {state.error ? <View style={styles.errorBox}><Text style={styles.error}>{state.error}</Text><Button label="Try again" variant="secondary" onPress={() => void notices.refresh()} /></View> : null}
      <FlatList
        data={state.notices}
        keyExtractor={(n) => n.id}
        refreshing={state.loading}
        onRefresh={() => void notices.refresh()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>{state.loading ? "Loading notices…" : state.error ? "Pull to refresh when you're connected." : "No notices yet. Updates will appear here."}</Text>}
        ListFooterComponent={state.nextCursor ? <Button label={state.loading ? "Loading…" : "Load older notices"} variant="secondary" disabled={state.loading} onPress={() => void notices.more()} /> : null}
        renderItem={({ item: n }) => (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={`${n.readAt ? "Read" : "Unread"}: ${n.title}`}
            accessibilityState={{ expanded: expanded === n.id }}
            onPress={() => { setExpanded(expanded === n.id ? undefined : n.id); if (!n.readAt) void read(n.id); }}
            style={[styles.notice, !n.readAt && styles.unread]}
          >
            <View style={styles.header}>
              <Text style={styles.date}>{new Date(n.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</Text>
              {!n.readAt ? <View style={styles.dot} /> : null}
              <Icon name={expanded === n.id ? "expand_less" : "expand_more"} size={20} color={colors.inkMuted} />
            </View>
            <Text style={type.heading}>{n.title}</Text>
            <Text style={styles.body} numberOfLines={expanded === n.id ? undefined : 2}>{n.body}</Text>
          </PressableScale>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  count: { ...type.bodyStrong, color: colors.inkMuted, marginTop: 14, marginBottom: 16 },
  list: { gap: 12, paddingBottom: 24 },
  notice: { padding: 18, gap: 8, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.paper },
  unread: { backgroundColor: colors.duskTint, borderColor: colors.duskSoft },
  header: { flexDirection: "row", gap: 8, alignItems: "center" },
  date: { ...type.meta, color: colors.inkMuted, flex: 1 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.dusk },
  body: { ...type.body, color: colors.inkSoft },
  empty: { ...type.body, color: colors.inkMuted, paddingVertical: 32 },
  error: { ...type.body, color: colors.clay },
  errorBox: { gap: 12, marginBottom: 16 },
});
