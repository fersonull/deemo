import { getAuth, getIdToken } from "@react-native-firebase/auth";
import { fetch as streamFetch } from "expo/fetch";
import { router, usePathname } from "expo-router";
import { useEffect, useState } from "react";
import { AppState, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/icon";
import { PressableScale } from "@/components/pressable-scale";
import { API_URL } from "@/constants";
import { notices, useNotices } from "@/hooks/use-notices";
import { colors, radius, type } from "@/theme";
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

  const current = state.notices.find((n) => !n.readAt && !state.dismissed.includes(n.id));
  if (!enabled || !active || held || state.owner !== uid || path === "/notices" || !current) return null;
  return (
    <View style={[styles.position, { top: top + 8 }]} pointerEvents="box-none">
      <View style={styles.banner} accessibilityLiveRegion="polite">
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`Notice from DEEMO: ${current.title}. Open inbox`}
          onPress={() => router.push({ pathname: "/notices", params: { id: current.id } })}
          style={styles.open}
        >
          <Icon name="campaign" size={24} color={colors.duskInk} />
          <View style={styles.copy}>
            <Text style={styles.label}>FROM DEEMO</Text>
            <Text style={styles.title} numberOfLines={2}>{current.title}</Text>
            <Text style={styles.body} numberOfLines={2}>{current.body}</Text>
            <Text style={styles.action}>Open inbox</Text>
          </View>
        </PressableScale>
        <PressableScale accessibilityRole="button" accessibilityLabel="Dismiss notice banner" onPress={() => notices.dismiss(current.id)} style={styles.close}>
          <Icon name="close" size={20} color={colors.duskInk} />
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  position: { position: "absolute", left: 12, right: 12, zIndex: 100 },
  banner: { flexDirection: "row", backgroundColor: colors.duskTint, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.duskSoft, elevation: 6 },
  open: { flex: 1, flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 16 },
  copy: { flex: 1, gap: 3 },
  label: { ...type.label, color: colors.duskInk },
  title: { ...type.heading, color: colors.duskInk },
  body: { ...type.body, color: colors.inkSoft },
  action: { ...type.bodyStrong, color: colors.duskInk, marginTop: 4 },
  close: { width: 44, height: 48, alignItems: "center", justifyContent: "center" },
});
