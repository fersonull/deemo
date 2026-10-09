import { Pressable, StyleSheet, Text } from "react-native";

import { Screen } from "@/components/screen";
import { session } from "@/hooks/use-session";
import { colors, type } from "@/theme";

export default function Profile() {
  return (
    <Screen scroll title="Profile">
      <Pressable accessibilityRole="button" onPress={session.signOut} style={styles.row}>
        <Text style={type.bodyStrong}>Sign out</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { height: 56, justifyContent: "center", marginTop: 16, borderTopWidth: 1, borderTopColor: colors.border },
});
