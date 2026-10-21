import { getAuth } from "@react-native-firebase/auth";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/button";
import { Deemo } from "@/components/deemo";
import { Fetching } from "@/components/fetching";
import { Screen } from "@/components/screen";
import { notices, useNotices } from "@/hooks/use-notices";
import { colors, type } from "@/theme";

// One notice, in full. Opened from the inbox or a push notification; opening it marks it read.
export function Notice() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const state = useNotices();
  const notice = state.notices.find((n) => n.id === id);
  const [readError, setReadError] = useState("");

  // Arriving from a push before the inbox has loaded: fetch once, then show it (or say it's gone).
  const tried = useRef(false);
  useEffect(() => {
    if (notice || tried.current) return;
    tried.current = true;
    void notices.refresh();
  }, [notice]);
  const unread = notice !== undefined && !notice.readAt;
  useEffect(() => {
    if (unread && id) void notices.read(id).catch(() => setReadError("Couldn't mark this notice as read."));
  }, [unread, id]);

  if (state.owner !== getAuth().currentUser?.uid) return null;

  if (!notice) {
    return (
      <Screen onBack={() => router.back()}>
        {state.loading || !state.loaded ? (
          <Fetching title="Opening the message" subtitle="Getting it from your inbox." />
        ) : (
          <View style={styles.gone}>
            <Deemo mood="encouraging" />
            <Text style={styles.goneTitle}>{"This message isn't here"}</Text>
            <Text style={styles.goneBody}>It may have been removed. Your other messages are in your inbox.</Text>
            <Button label="Go to inbox" variant="secondary" onPress={() => router.replace("/notices")} />
          </View>
        )}
      </Screen>
    );
  }

  const sent = new Date(notice.createdAt).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <Screen scroll onBack={() => router.back()}>
      <View style={styles.sender}>
        <View style={styles.avatar}>
          <Deemo size="s" mood="waving" />
        </View>
        <View style={styles.flex}>
          <Text style={styles.from}>DEEMO</Text>
          <Text style={styles.date}>{sent}</Text>
        </View>
      </View>
      <Text accessibilityRole="header" style={styles.title}>{notice.title}</Text>
      <Text selectable style={styles.body}>{notice.body}</Text>
      {readError ? <Text accessibilityRole="alert" style={styles.error}>{readError}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  sender: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8, paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: colors.border },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.duskTint, alignItems: "center", justifyContent: "center" },
  from: { ...type.label, color: colors.duskInk },
  date: { ...type.meta, color: colors.inkMuted, marginTop: 4 },
  title: { ...type.title, fontSize: 28, lineHeight: 32, marginTop: 24 },
  body: { ...type.body, fontSize: 16, lineHeight: 26, color: colors.inkSoft, marginTop: 16 },
  error: { ...type.body, fontSize: 13, color: colors.warnInk, marginTop: 16 },
  gone: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 24, paddingBottom: 60 },
  goneTitle: { ...type.heading, fontSize: 20, marginTop: 8 },
  goneBody: { ...type.body, color: colors.inkMuted, textAlign: "center", marginBottom: 12 },
});

