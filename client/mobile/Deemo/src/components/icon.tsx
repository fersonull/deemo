import { Text, type TextStyle } from "react-native";

import { colors, fonts } from "@/theme";

type Props = {
  name: string; // Material Symbols ligature, e.g. "mic"
  size?: number;
  color?: string;
  filled?: boolean;
  style?: TextStyle;
};

export function Icon({ name, size = 22, color = colors.ink, filled, style }: Props) {
  return (
    <Text
      accessible={false}
      importantForAccessibility="no"
      allowFontScaling={false}
      style={[{ fontFamily: filled ? fonts.iconFilled : fonts.icon, fontSize: size, lineHeight: size, color }, style]}
    >
      {name}
    </Text>
  );
}
