import { StyleSheet, Text, type StyleProp, type TextStyle } from "react-native";

import { useSession } from "@/hooks/use-session";
import { colors, type } from "@/theme";

// How many of the Free plan's daily practice sessions are left (nothing for Premium, or before the count is known).
// At zero it says when more come, with an optional way to Premium.
export function SessionsLeft({ onUpgrade, style }: { onUpgrade?: () => void; style?: StyleProp<TextStyle> }) {
  const { usedToday, dailyCap } = useSession();
  if (dailyCap === null) return null;
  const left = Math.max(0, dailyCap - usedToday);
  return (
    <Text style={[styles.text, style]} accessibilityLiveRegion="polite">
      {left > 0
        ? `${left} of ${dailyCap} free ${dailyCap === 1 ? "session" : "sessions"} left today`
        : `You've used today's ${dailyCap} free sessions. More tomorrow.`}
      {left === 0 && onUpgrade ? (
        <Text style={styles.link} accessibilityRole="button" onPress={onUpgrade}>
          {" Try Premium"}
        </Text>
      ) : null}
    </Text>
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
});
