import {
  getInitialNotification,
  getMessaging,
  getToken,
  onNotificationOpenedApp,
  onTokenRefresh,
} from "@react-native-firebase/messaging";
import { router } from "expo-router";
import { useEffect } from "react";
import { PermissionsAndroid, Platform } from "react-native";

import { api } from "@/utils/api";

// Notices as phone notifications while the app is closed or in the background (server: notices/infrastructure/
// push.ts). An open app gets no popup; notice-delivery.tsx keeps its inbox and unread count in sync.
const json = (method: string, token: string) => ({
  method,
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ token }),
});
const save = (token: string) => api("/notices/push-token", json("PUT", token)).catch(() => {}); // retried next launch

type RemoteMessage = Parameters<Parameters<typeof onNotificationOpenedApp>[1]>[0]; // not exported by the package

const open = (m: RemoteMessage | null) => {
  const id = m?.data?.noticeId;
  if (typeof id === "string") router.push({ pathname: "/notice", params: { id } });
};
let launchHandled = false; // the notification that opened a closed app, handled once per launch

export function usePushNotices(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const messaging = getMessaging();
    let stopped = false;
    void (async () => {
      // Android 13+ asks once (and once more after a "no"); a refusal just leaves notices in the app.
      if (Platform.OS === "android" && Platform.Version >= 33) {
        await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS).catch(() => {});
      }
      const token = await getToken(messaging).catch(() => null);
      if (token && !stopped) await save(token);
      if (!launchHandled) {
        launchHandled = true;
        open(await getInitialNotification(messaging).catch(() => null));
      }
    })();
    const offRefresh = onTokenRefresh(messaging, (t) => void save(t));
    const offOpened = onNotificationOpenedApp(messaging, open); // tapped while the app was in the background
    return () => {
      stopped = true;
      offRefresh();
      offOpened();
    };
  }, [enabled]);
}

// Before signing out: this phone stops getting the account's notices. Best effort; the server also drops a token
// FCM rejects, and a token that signs in to another account moves to it.
export async function forgetPushToken() {
  const token = await getToken(getMessaging()).catch(() => null);
  if (token) await api("/notices/push-token", json("DELETE", token)).catch(() => {});
}
