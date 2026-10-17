import { getAuth } from "@react-native-firebase/auth";
import { router } from "expo-router";
import { useEffect } from "react";
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
  useEffect(() => { void notices.refresh(); }, []);
  if (state.owner !== getAuth().currentUser?.uid) return null;
  const first = state.loading && !state.notices.length;
  const last = state.notices.length - 1;

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
          ListFooterComponent={state.nextCursor ? <View style={styles.footer}><Button label={state.loading ? "Loading…" : "Load older notices"} variant="secondary" disabled={state.loading} onPress={() => void notices.more()} /></View> : null}
          renderItem={({ item: n, index }) => {
            const unread = !n.readAt;
            // One sand group, like Profile's settings: rounded at the ends, hairlines between rows.
            return (
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={`${unread ? "Unread" : "Read"} notice, ${noticeWhen(n.createdAt)}: ${n.title}`}
                accessibilityHint="Opens the full message"
                scaleTo={0.98}
                onPress={() => router.push({ pathname: "/notice", params: { id: n.id } })}
                style={[styles.row, index === 0 && styles.rowFirst, index === last && styles.rowLast, index > 0 && styles.divider]}
              >
                <View style={[styles.badge, unread && styles.badgeUnread]}>
                  <Icon name="campaign" size={18} filled={unread} color={unread ? colors.paper : colors.duskIcon} />
                </View>
                <View style={styles.copy}>
                  <View style={styles.line}>
                    <Text style={[styles.title, unread && styles.titleUnread]} numberOfLines={1}>{n.title}</Text>
                    <Text style={[styles.date, unread && styles.dateUnread]}>{noticeWhen(n.createdAt)}</Text>
                  </View>
                  <View style={styles.line}>
                    <Text style={styles.preview} numberOfLines={1}>{n.body}</Text>
                    {unread ? <View style={styles.dot} /> : null}
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
  status: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", marginTop: 14, marginBottom: 14, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: colors.duskTint },
  statusDone: { backgroundColor: colors.sageTint },
  statusText: { ...type.bodyStrong, fontSize: 13, color: colors.duskInk },
  statusTextDone: { color: colors.sageInk },
  list: { paddingBottom: 24 },
  listEmpty: { flexGrow: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 64, paddingVertical: 11, paddingHorizontal: 14, backgroundColor: colors.sand },
  rowFirst: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl },
  rowLast: { borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  badge: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: colors.paper },
  badgeUnread: { backgroundColor: colors.dusk },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  line: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { ...type.bodyStrong, flex: 1, color: colors.inkSoft },
  titleUnread: { fontWeight: "700", color: colors.ink },
  date: { ...type.meta, color: colors.muted },
  dateUnread: { color: colors.duskInk, fontWeight: "500" },
  preview: { ...type.meta, fontSize: 13, flex: 1, color: colors.inkMuted },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.dusk },
  footer: { marginTop: 14 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 48, paddingHorizontal: 24 },
  emptyTitle: { ...type.heading, fontSize: 20, marginTop: 18 },
  emptyBody: { ...type.body, color: colors.inkMuted, textAlign: "center", marginTop: 6 },
  error: { ...type.body, color: colors.warnInk },
  errorBox: { gap: 12, marginBottom: 16 },
});
