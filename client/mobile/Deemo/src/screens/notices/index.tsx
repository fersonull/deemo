import { getAuth } from "@react-native-firebase/auth";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/button";
import { Deemo } from "@/components/deemo";
import { Fetching } from "@/components/fetching";
import { Icon } from "@/components/icon";
import { PressableScale } from "@/components/pressable-scale";
import { Screen } from "@/components/screen";
import { notices, useNotices } from "@/hooks/use-notices";
import { colors, radius, type } from "@/theme";
import { noticeWhen } from "@/utils/notice-when";

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

  const first = state.loading && !state.notices.length;

  return (
    <Screen title="Your inbox" subtitle="Updates and messages from DEEMO." onBack={() => router.back()}>
      {state.notices.length > 0 && (
        <View style={[styles.status, !state.unread && styles.statusDone]}>
          <Icon name={state.unread ? "mark_email_unread" : "done_all"} size={18} color={state.unread ? colors.duskInk : colors.sageInk} />
          <Text style={[styles.statusText, !state.unread && styles.statusTextDone]}>
            {state.unread ? `${state.unread} unread` : "You're all caught up"}
          </Text>
        </View>
      )}
      {readError ? <Text accessibilityRole="alert" style={styles.error}>{readError}</Text> : null}
      {state.error ? <View style={styles.errorBox}><Text style={styles.error}>{state.error}</Text><Button label="Try again" variant="secondary" onPress={() => void notices.refresh()} /></View> : null}
      {first ? (
        <Fetching title="Opening your inbox" subtitle="Getting your messages from DEEMO." />
      ) : (
        <FlatList
          data={state.notices}
          keyExtractor={(n) => n.id}
          refreshing={state.loading}
          onRefresh={() => void notices.refresh()}
          contentContainerStyle={[styles.list, !state.notices.length && styles.listEmpty]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Deemo mood="idle" />
              <Text style={styles.emptyTitle}>{state.error ? "Can't reach your inbox" : "No notices yet"}</Text>
              <Text style={styles.emptyBody}>
                {state.error ? "Pull down to try again when you're connected." : "Updates and messages from DEEMO will show up here."}
              </Text>
            </View>
          }
          ListFooterComponent={state.nextCursor ? <Button label={state.loading ? "Loading…" : "Load older notices"} variant="secondary" disabled={state.loading} onPress={() => void notices.more()} /> : null}
          renderItem={({ item: n }) => {
            const open = expanded === n.id;
            const unread = !n.readAt;
            return (
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={`${unread ? "Unread" : "Read"} notice, ${noticeWhen(n.createdAt)}: ${n.title}`}
                accessibilityState={{ expanded: open }}
                scaleTo={0.98}
                onPress={() => { setExpanded(open ? undefined : n.id); if (unread) void read(n.id); }}
                style={[styles.notice, unread && styles.unread]}
              >
                <View style={[styles.badge, unread && styles.badgeUnread]}>
                  <Icon name="campaign" size={20} filled={unread} color={unread ? colors.paper : colors.duskIcon} />
                </View>
                <View style={styles.copy}>
                  <View style={styles.header}>
                    <Text style={styles.from}>DEEMO</Text>
                    <Text style={styles.date}>· {noticeWhen(n.createdAt)}</Text>
                    {unread ? <View style={styles.dot} /> : null}
                  </View>
                  <Text style={[styles.title, !unread && styles.titleRead]} numberOfLines={open ? undefined : 1}>{n.title}</Text>
                  <Text style={styles.body} numberOfLines={open ? undefined : 2}>{n.body}</Text>
                  <View style={styles.more}>
                    <Text style={styles.moreText}>{open ? "Show less" : "Read more"}</Text>
                    <Icon name={open ? "expand_less" : "expand_more"} size={18} color={colors.duskLink} />
                  </View>
                </View>
              </PressableScale>
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  status: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", marginTop: 14, marginBottom: 16, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: colors.duskTint },
  statusDone: { backgroundColor: colors.sageTint },
  statusText: { ...type.bodyStrong, fontSize: 13, color: colors.duskInk },
  statusTextDone: { color: colors.sageInk },
  list: { gap: 10, paddingBottom: 24 },
  listEmpty: { flexGrow: 1 },
  notice: { flexDirection: "row", gap: 14, padding: 16, borderRadius: radius.xl, backgroundColor: colors.sand },
  unread: { backgroundColor: colors.duskTint },
  badge: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: colors.paper },
  badgeUnread: { backgroundColor: colors.dusk },
  copy: { flex: 1, minWidth: 0, gap: 4 },
  header: { flexDirection: "row", alignItems: "center", gap: 6 },
  from: { ...type.label, color: colors.duskInk },
  date: { ...type.meta, color: colors.inkMuted, flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.dusk },
  title: { ...type.heading, lineHeight: 22 },
  titleRead: { color: colors.inkSoft },
  body: { ...type.body, color: colors.inkSoft },
  more: { flexDirection: "row", alignItems: "center", gap: 2, marginTop: 2 },
  moreText: { ...type.bodyStrong, fontSize: 13, color: colors.duskLink },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 48, paddingHorizontal: 24 },
  emptyTitle: { ...type.heading, fontSize: 20, marginTop: 18 },
  emptyBody: { ...type.body, color: colors.inkMuted, textAlign: "center", marginTop: 6 },
  error: { ...type.body, color: colors.warnInk },
  errorBox: { gap: 12, marginBottom: 16 },
});
