import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { useSession } from "@/hooks/use-session";
import { colors } from "@/theme";

export default function RootLayout() {
  const { signedIn } = useSession();

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }}>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="welcome" />
          <Stack.Screen name="consent" />
          <Stack.Screen name="sign-in" />
        </Stack.Protected>
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="practice" />
          <Stack.Screen name="mic-check" />
          <Stack.Screen name="session" />
        </Stack.Protected>
      </Stack>
    </>
  );
}
