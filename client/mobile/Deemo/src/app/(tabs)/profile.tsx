import { Pressable, StyleSheet, Text } from "react-native";

import { Screen } from "@/components/screen";
import { session, useSession } from "@/hooks/use-session";
import { colors, type } from "@/theme";

// ponytail: account basics only; settings and "delete everything" (addendum Q9) are the next Profile task.
export default function Profile() {
  const { email, premium } = useSession();
  return (
    <Screen scroll tabBar title="Profile" subtitle={`${email ?? "Signed in"} · ${premium ? "Premium (demo)" : "Free plan"}`}>
      <Pressable accessibilityRole="button" onPress={() => void session.signOut()} style={styles.row}>
        <Text style={type.bodyStrong}>Sign out</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { height: 56, justifyContent: "center", marginTop: 16, borderTopWidth: 1, borderTopColor: colors.border },
});
