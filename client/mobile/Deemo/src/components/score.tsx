import { StyleSheet, Text, View, type TextStyle } from "react-native";

import { colors, fonts } from "@/theme";

type Props = {
  value: number;
  style: TextStyle; // the number's look; needs a fontSize
  caption?: boolean; // "readiness" under it, where a bare number would be ambiguous (list rows)
  align?: "left" | "right";
};

// A readiness score with its unit: the number, then a smaller "%" (readiness is out of 100), so "86" never stands
// alone. Screen readers hear "86 percent readiness".
export function Score({ value, style, caption, align = "left" }: Props) {
  const size = style.fontSize ?? 15;
  return (
    <View
      style={align === "right" ? styles.right : undefined}
      accessible
      accessibilityLabel={`${value} percent readiness`}
    >
      <Text style={style}>
        {value}
        <Text style={{ fontSize: Math.round(size * 0.55), letterSpacing: 0 }}>%</Text>
      </Text>
      {caption ? <Text style={styles.caption}>readiness</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  right: { alignItems: "flex-end" },
  caption: { fontFamily: fonts.body, fontWeight: "500", fontSize: 10, color: colors.muted, marginTop: -1 },
});
