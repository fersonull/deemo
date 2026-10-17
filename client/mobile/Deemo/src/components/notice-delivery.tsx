import { getAuth, getIdToken } from "@react-native-firebase/auth";
import { fetch as streamFetch } from "expo/fetch";
import { router, usePathname } from "expo-router";
import { useEffect, useState } from "react";
import { AppState, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Deemo } from "@/components/deemo";
import { Icon } from "@/components/icon";
import { PressableScale } from "@/components/pressable-scale";
import { API_URL } from "@/constants";
import { notices, useNotices } from "@/hooks/use-notices";
import { colors, easeOut, radius, type } from "@/theme";
import { noticeFrames } from "@/utils/notice-stream";

export function NoticeDelivery({ enabled }: { enabled: boolean }) {
  const path = usePathname();
  const { top } = useSafeAreaInsets();
  const [active, setActive] = useState(AppState.currentState === "active");
  const state = useNotices();
  const held = path === "/session" || path === "/mic-check" || path === "/scoring";
  const uid = enabled ? getAuth().currentUser?.uid : undefined;

  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => setActive(s === "active"));
    return () => sub.remove();
  }, []);

  useEffect(() => { notices.reset(uid ?? null); }, [uid]);

  useEffect(() => {
    if (!uid || !active || held) return;
    // Close during practice as well as backgrounding. The inbox catches up when practice finishes.
    let stopped = false;
    let controller: AbortController | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let failures = 0;
    const connect = async () => {
      controller = new AbortController();
      try {
        const user = getAuth().currentUser;
        if (!user || user.uid !== uid) return;
        const token = await getIdToken(user, failures > 0);
        if (stopped) return;
        const response = await streamFetch(`${API_URL}/notices/stream`, {
          headers: { Authorization: `Bearer ${token}`, Accept: "text/event-stream" },
          signal: controller.signal,
        });
        if (!response.ok || !response.body) throw new Error(`Notice stream: ${response.status}`);
        failures = 0;
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        const push = noticeFrames(() => { if (!stopped) void notices.refresh(); });
        try {
          while (!stopped) {
            const { done, value } = await reader.read();
            if (done) break;
            push(decoder.decode(value, { stream: true }));
          }
        } finally { reader.releaseLock(); }
      } catch {
        failures++;
      } finally {
        if (!stopped) timer = setTimeout(() => void connect(), Math.min(30_000, 1000 * 2 ** Math.min(failures, 5)));
      }
    };
    void notices.refresh();
    void connect();
    return () => { stopped = true; controller?.abort(); if (timer) clearTimeout(timer); };
  }, [uid, active, held]);

  const unread = state.notices.filter((n) => !n.readAt && !state.dismissed.includes(n.id));
  const current = unread[0];
  if (!enabled || !active || held || state.owner !== uid || path === "/notices" || !current) return null;
  const more = unread.length - 1;
  return (
    <View style={[styles.position, { top: top + 8 }]} pointerEvents="box-none">
      {/* Keyed by notice: the next one drops in as the last leaves. Reduce motion skips both (Reanimated's default). */}
      <Animated.View
        key={current.id}
        entering={FadeInDown.duration(260).easing(easeOut)}
        exiting={FadeOutUp.duration(180)}
        style={styles.toast}
        accessibilityLiveRegion="polite"
      >
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`Notice from DEEMO: ${current.title}. ${current.body}. Open inbox`}
          onPress={() => router.push({ pathname: "/notices", params: { id: current.id } })}
          scaleTo={0.98}
          style={styles.open}
        >
          <View style={styles.avatar}>
            <Deemo size="s" mood="waving" />
          </View>
          <View style={styles.copy}>
            <View style={styles.meta}>
              <Text style={styles.label}>FROM DEEMO</Text>
              {more > 0 && <Text style={styles.more}>+{more} more</Text>}
            </View>
            <Text style={styles.title} numberOfLines={1}>{current.title}</Text>
            <Text style={styles.body} numberOfLines={2}>{current.body}</Text>
          </View>
        </PressableScale>
        <PressableScale accessibilityRole="button" accessibilityLabel="Dismiss notice" hitSlop={8} onPress={() => notices.dismiss(current.id)} style={styles.close}>
          <Icon name="close" size={18} color={colors.faint} />
        </PressableScale>
      </Animated.View>
    </View>
  );
}

// An ink card floating over the paper screens, so it reads as a message rather than another piece of the page.
const styles = StyleSheet.create({
  position: { position: "absolute", left: 12, right: 12, zIndex: 100 },
  toast: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.ink,
    borderRadius: radius.xl,
    boxShadow: "0 10px 28px rgba(42, 36, 32, 0.28)",
  },
  open: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingLeft: 14 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.duskTint, alignItems: "center", justifyContent: "center" },
  copy: { flex: 1, gap: 2 },
  meta: { flexDirection: "row", alignItems: "center", gap: 8 },
  label: { ...type.label, color: colors.faint },
  more: { ...type.label, color: colors.ink, backgroundColor: colors.duskSoft, borderRadius: radius.xs, paddingHorizontal: 5, paddingVertical: 1, overflow: "hidden" },
  title: { ...type.heading, color: colors.paper },
  body: { ...type.body, fontSize: 13.5, lineHeight: 19, color: colors.sand },
  close: { width: 44, height: 44, marginTop: 4, alignItems: "center", justifyContent: "center" },
});
