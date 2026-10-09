import type { ReactNode } from "react";
import { View, type ViewStyle } from "react-native";

import { colors } from "@/theme";

// The prototype's organic shape is CSS "58% 42% 52% 48% / 55% 50% 50% 45%".
// RN has no elliptical corners, so each corner averages its two radii.
const H = [0.58, 0.42, 0.52, 0.48]; // top-left, top-right, bottom-right, bottom-left
const V = [0.55, 0.5, 0.5, 0.45];

type Props = {
  width: number;
  height: number;
  color?: string;
  style?: ViewStyle;
  children?: ReactNode;
};

export function Blob({ width, height, color = colors.dusk, style, children }: Props) {
  const raw = [0, 1, 2, 3].map((i) => (H[i] * width + V[i] * height) / 2);
  // Scale down like CSS does when adjacent corners overflow a side; Android draws them flat otherwise.
  const [tl, tr, br, bl] = raw;
  const f = Math.min(1, width / (tl + tr), width / (bl + br), height / (tl + bl), height / (tr + br));
  const r = (i: number) => raw[i] * f;
  return (
    <View
      style={[
        {
          width,
          height,
          backgroundColor: color,
          borderTopLeftRadius: r(0),
          borderTopRightRadius: r(1),
          borderBottomRightRadius: r(2),
          borderBottomLeftRadius: r(3),
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
