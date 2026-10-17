import { getAuth, getIdToken } from "@react-native-firebase/auth";
import { fetch as streamFetch } from "expo/fetch";
import { router, usePathname } from "expo-router";
import { useEffect, useState } from "react";
import { AppState } from "react-native";

import { FloatingNotice } from "@/components/floating-notice";
import { API_URL } from "@/constants";
import { notices, useNotices } from "@/hooks/use-notices";
import { noticeFrames } from "@/utils/notice-stream";

export function NoticeDelivery({ enabled }: { enabled: boolean }) {
  const path = usePathname();
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
  return (
    <FloatingNotice
      title={current.title}
      unread={unread.length}
      onOpen={() => router.push({ pathname: "/notices", params: { id: current.id } })}
      onDismiss={() => notices.dismiss(current.id)}
    />
  );
}
