import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/icon";
import { PressableScale } from "@/components/pressable-scale";
import { useNotices } from "@/hooks/use-notices";
import { colors, fonts } from "@/theme";

export function InboxButton() {
  const { unread } = useNotices();
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={`Inbox, ${unread} unread notices`} onPress={() => router.push("/notices")} hitSlop={2} style={styles.button}>
      <Icon name="inbox" size={24} />
      {unread > 0 ? <View style={styles.badge}><Text style={styles.count}>{unread > 99 ? "99+" : unread}</Text></View> : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginRight: 8 },
  badge: { position: "absolute", top: 0, right: 0, backgroundColor: colors.dusk, borderRadius: 12, minWidth: 18, paddingHorizontal: 4, height: 18, alignItems: "center", justifyContent: "center" },
  count: { fontFamily: fonts.body, fontWeight: "700", fontSize: 10, color: colors.paper },
});
