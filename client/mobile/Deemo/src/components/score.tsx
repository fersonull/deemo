import { StyleSheet, Text, View, type TextStyle } from "react-native";

import { colors, fonts } from "@/theme";
import { bandOf } from "@/utils/bands";

type Props = {
  value: number;
  style: TextStyle; // the number's look; needs a fontSize
  caption?: boolean; // a word under it, where a bare number would be ambiguous (list rows)
  banded?: boolean; // color it by readiness band; the caption names the band
  align?: "left" | "right";
};

// A readiness score with its unit: the number, then a smaller "%" (readiness is out of 100), so "86" never stands
// alone. `banded` colors it by band (sage, dusk, amber, clay) and names the band underneath, so the color never
// stands alone either. Screen readers hear "86 percent readiness, Defense-ready".
export function Score({ value, style, caption, banded, align = "left" }: Props) {
  const size = style.fontSize ?? 15;
  const band = banded ? bandOf(value) : null;
  return (
    <View
      style={align === "right" ? styles.right : undefined}
      accessible
      accessibilityLabel={`${value} percent readiness${band ? `, ${band.name}` : ""}`}
    >
      <Text style={[style, band && { color: band.ink }]}>
        {value}
        <Text style={{ fontSize: Math.round(size * 0.55), letterSpacing: 0 }}>%</Text>
      </Text>
      {caption ? <Text style={[styles.caption, band && { color: band.ink }]}>{band ? band.short : "readiness"}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  right: { alignItems: "flex-end" },
  caption: { fontFamily: fonts.body, fontWeight: "500", fontSize: 10, color: colors.muted, marginTop: -1 },
});
