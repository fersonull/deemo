import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";

import { projects } from "@/hooks/use-projects";
import { useSession } from "@/hooks/use-session";
import { sessions } from "@/hooks/use-sessions";
import { colors } from "@/theme";

// Hold the splash until Firebase says whether someone is still signed in (no flash of the welcome screen).
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { ready, signedIn } = useSession();

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  // Know the active manuscript from the start, so every path into a session uses it; forget it all on sign-out.
  useEffect(() => {
    if (signedIn) void projects.refresh();
    else {
      projects.reset();
      sessions.reset();
    }
  }, [signedIn]);

  if (!ready) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{ headerShown: false, animation: "fade_from_bottom", contentStyle: { backgroundColor: colors.paper } }}
      >
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="welcome" />
          <Stack.Screen name="consent" />
          <Stack.Screen name="sign-in" />
        </Stack.Protected>
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="analysis" />
          <Stack.Screen name="practice" />
          <Stack.Screen name="rubric" />
          <Stack.Screen name="results" />
          <Stack.Screen name="mic-check" />
          <Stack.Screen name="session" options={{ gestureEnabled: false }} />
          <Stack.Screen name="scoring" options={{ gestureEnabled: false }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}
