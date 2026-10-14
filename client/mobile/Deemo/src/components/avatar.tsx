import { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import { colors, fonts } from "@/theme";
import { avatarUrl } from "@/utils/avatar";
import { initials } from "@/utils/initials";

type Props = { seed: string | null; name: string | null; email?: string | null; size: number };

// A student's face (DiceBear, see utils/avatar.ts). The initials sit underneath, so they show while the image loads,
// before the account record arrives, offline, or if DiceBear is down.
export function Avatar({ seed, name, email = null, size }: Props) {
  const [failed, setFailed] = useState<string | null>(null); // the seed whose image failed
  const round = { width: size, height: size, borderRadius: size / 2 };
  return (
    <View style={[styles.avatar, round]}>
      <Text style={[styles.initials, { fontSize: size * 0.36 }]}>{initials(name, email)}</Text>
      {seed && failed !== seed ? (
        <Image
          source={{ uri: avatarUrl(seed) }}
          onError={() => setFailed(seed)}
          style={[StyleSheet.absoluteFill, round]}
          accessibilityIgnoresInvertColors
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { backgroundColor: colors.duskTint, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  initials: { fontFamily: fonts.body, fontWeight: "600", color: colors.duskInk },
});
