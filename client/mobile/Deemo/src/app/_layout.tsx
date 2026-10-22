import { Stack, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { AppState } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { practiceSetup } from "@/hooks/use-practice-setup";
import { projects } from "@/hooks/use-projects";
import { session, useSession } from "@/hooks/use-session";
import { sessions } from "@/hooks/use-sessions";
import { trackTouch } from "@/hooks/touch-point";
import { colors } from "@/theme";
import { onboarding, useOnboarded } from "@/utils/onboarded";
import { theme } from "@/utils/theme-choice";
import { NoticeDelivery } from "@/components/notice-delivery";
import { Maintenance } from "@/components/maintenance";
import { maintenance, useMaintenance } from "@/utils/maintenance";

// Hold the splash until Firebase says whether someone is still signed in (no flash of the welcome screen).
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { ready, signedIn, verified, accountLoaded, consentAt, course } = useSession();
  const inside = signedIn && verified; // email sign-ups wait on verify-email until they tap the link
  const onboarded = useOnboarded(); // the welcome slides show once per phone
  // An account with no consent on record (made before consent was stored server-side) sees the consent screen first.
  const needsConsent = inside && accountLoaded && !consentAt;
  // Then the onboarding survey (their course), once; older accounts see it on their next open.
  const needsCourse = inside && accountLoaded && !needsConsent && !course;
  // Maintenance covers everything, except a live session already under way: it talks to Gemini directly, finishes,
  // and is kept on the phone (session backup) until it can be scored.
  const path = usePathname();
  const closed = useMaintenance().on && path !== "/session";

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  // Is DEEMO in maintenance? Asked on launch and whenever the app comes back to the foreground, signed in or not.
  useEffect(() => {
    void maintenance.check();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void maintenance.check();
    });
    return () => sub.remove();
  }, []);

  // Know the active manuscript from the start, so every path into a session uses it; forget it all on sign-out,
  // including the last setup (its manuscript and Premium-only choices belong to that account).
  useEffect(() => {
    if (inside) {
      onboarding.done();
      void projects.refresh(true);
    } else {
      projects.reset();
      sessions.reset();
      practiceSetup.reset();
    }
  }, [inside]);

  // Re-read the account (Premium, typed answers) when the app comes back to the foreground, so a change made
  // elsewhere shows up without asking the server on every screen.
  useEffect(() => {
    if (!inside) return;
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void session.refresh();
    });
    return () => sub.remove();
  }, [inside]);

  if (!ready) return null;

  // Watch touches (without taking them) so Deemo can look where the student taps.
  return (
    <GestureHandlerRootView
      style={{ flex: 1 }}
      onTouchStart={(e) => trackTouch(e.nativeEvent.pageX, e.nativeEvent.pageY, true)}
      onTouchMove={(e) => trackTouch(e.nativeEvent.pageX, e.nativeEvent.pageY, true)}
      onTouchEnd={(e) => trackTouch(e.nativeEvent.pageX, e.nativeEvent.pageY, false)}
      onTouchCancel={(e) => trackTouch(e.nativeEvent.pageX, e.nativeEvent.pageY, false)}
    >
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{ headerShown: false, animation: "fade_from_bottom", contentStyle: { backgroundColor: colors.paper } }}
      >
        <Stack.Protected guard={!signedIn && !onboarded}>
          <Stack.Screen name="welcome" />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="sign-in" />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn || needsConsent}>
          <Stack.Screen name="consent" />
        </Stack.Protected>
        <Stack.Protected guard={needsCourse}>
          <Stack.Screen name="survey" options={{ gestureEnabled: false }} />
        </Stack.Protected>
        <Stack.Protected guard={signedIn && !verified}>
          <Stack.Screen name="verify-email" options={{ gestureEnabled: false }} />
        </Stack.Protected>
        <Stack.Protected guard={inside && !needsConsent && !needsCourse}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="analysis" />
          <Stack.Screen name="practice" />
          <Stack.Screen name="rubric" />
          <Stack.Screen name="premium" />
          <Stack.Screen name="notices" />
          <Stack.Screen name="notice" />
          <Stack.Screen name="results" />
          <Stack.Screen name="mic-check" />
          <Stack.Screen name="session" options={{ gestureEnabled: false }} />
          <Stack.Screen name="scoring" options={{ gestureEnabled: false }} />
        </Stack.Protected>
      </Stack>
      <NoticeDelivery enabled={inside && accountLoaded && !needsConsent && !needsCourse && !closed} />
      {closed ? <Maintenance /> : null}
    </GestureHandlerRootView>
  );
}
