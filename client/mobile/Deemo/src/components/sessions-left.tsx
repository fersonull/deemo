import { router } from "expo-router";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import { useSession } from "@/hooks/use-session";
import { colors, space, type } from "@/theme";

// How many of the Free plan's daily practice sessions are left, with a way to Premium (nothing for Premium, or before
// the count is known). While some are left it's a quiet line with a "Go unlimited" link; at zero the line says when
// more come and a Premium button takes its place as the main way forward. Upgrading opens `onUpgrade` (a screen's
// own upsell sheet) or the Premium screen.
export function SessionsLeft({ onUpgrade, style }: { onUpgrade?: () => void; style?: StyleProp<ViewStyle> }) {
  const { usedToday, dailyCap } = useSession();
  if (dailyCap === null) return null;
  const left = Math.max(0, dailyCap - usedToday);
  const upgrade = onUpgrade ?? (() => router.push("/premium"));

  if (left > 0)
    return (
      <View style={style}>
        <Text style={styles.text} accessibilityLiveRegion="polite">
          {`${left} of ${dailyCap} free ${dailyCap === 1 ? "session" : "sessions"} left today · `}
          <Text style={styles.link} accessibilityRole="button" onPress={upgrade}>
            Go unlimited
          </Text>
        </Text>
      </View>
    );

  return (
    <View style={[styles.out, style]}>
      <Text style={styles.text} accessibilityLiveRegion="polite">
        {`You've used today's ${dailyCap} free sessions. More tomorrow, or practice as much as you like with Premium.`}
      </Text>
      <Button
        variant="premium"
        label="Get unlimited practice"
        leading={<Icon name="workspace_premium" size={22} color={colors.gold} filled />}
        onPress={upgrade}
      />
    </View>
  );
}

// Whether the student can start another session today (true while the count isn't known: the server has the final say).
export const useCanStart = () => {
  const { usedToday, dailyCap } = useSession();
  return dailyCap === null || usedToday < dailyCap;
};

const styles = StyleSheet.create({
  text: { ...type.meta, color: colors.muted, textAlign: "center" },
  link: { color: colors.duskLink, fontWeight: "600" },
  out: { gap: space.md },
});
