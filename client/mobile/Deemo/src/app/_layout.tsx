import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { AppState, View } from "react-native";

import { projects } from "@/hooks/use-projects";
import { session, useSession } from "@/hooks/use-session";
import { sessions } from "@/hooks/use-sessions";
import { trackTouch } from "@/hooks/touch-point";
import { colors } from "@/theme";

// Hold the splash until Firebase says whether someone is still signed in (no flash of the welcome screen).
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { ready, signedIn, verified, accountLoaded, consentAt, course } = useSession();
  const inside = signedIn && verified; // email sign-ups wait on verify-email until they tap the link
  // An account with no consent on record (made before consent was stored server-side) sees the consent screen first.
  const needsConsent = inside && accountLoaded && !consentAt;
  // Then the onboarding survey (their course), once; older accounts see it on their next open.
  const needsCourse = inside && accountLoaded && !needsConsent && !course;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  // Know the active manuscript from the start, so every path into a session uses it; forget it all on sign-out.
  useEffect(() => {
    if (inside) void projects.refresh(true);
    else {
      projects.reset();
      sessions.reset();
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
    <View
      style={{ flex: 1 }}
      onTouchStart={(e) => trackTouch(e.nativeEvent.pageX, e.nativeEvent.pageY, true)}
      onTouchMove={(e) => trackTouch(e.nativeEvent.pageX, e.nativeEvent.pageY, true)}
      onTouchEnd={(e) => trackTouch(e.nativeEvent.pageX, e.nativeEvent.pageY, false)}
      onTouchCancel={(e) => trackTouch(e.nativeEvent.pageX, e.nativeEvent.pageY, false)}
    >
      <StatusBar style="dark" />
      <Stack
        screenOptions={{ headerShown: false, animation: "fade_from_bottom", contentStyle: { backgroundColor: colors.paper } }}
      >
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="welcome" />
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
          <Stack.Screen name="results" />
          <Stack.Screen name="mic-check" />
          <Stack.Screen name="session" options={{ gestureEnabled: false }} />
          <Stack.Screen name="scoring" options={{ gestureEnabled: false }} />
        </Stack.Protected>
      </Stack>
    </View>
  );
}
