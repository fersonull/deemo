// Tokens from the claude.ai/design prototype (docs/design/DEEMO Prototype.dc.html).
// oklch values converted to hex because React Native can't parse oklch().
// ponytail: light theme only — the prototype has no dark palette yet; add one when it's designed.

import { Easing } from "react-native-reanimated";

import { colors } from "./colors";

export { colors };

// Panelist avatar fills (Chair, Technical, Methodology)
export const panelist = {
  chair: "#E4D9C6",
  technical: colors.duskSoft,
  methodology: colors.sageSoft,
} as const;

// Embedded at build time by the expo-font plugin (app.json) as Android font families,
// so fontWeight picks the right file. Only the weights listed there exist.
// Icons are ligature fonts: <Text style={{ fontFamily: fonts.icon }}>mic</Text>
export const fonts = {
  display: "Bricolage Grotesque", // 500–800
  body: "DM Sans", // 400–700
  mono: "DM Mono", // 400–500
  icon: "Material Symbols Rounded",
  iconFilled: "Material Symbols Rounded Filled",
} as const;

export const type = {
  display: { fontFamily: fonts.display, fontWeight: "800", fontSize: 40, lineHeight: 42, letterSpacing: -1.6, color: colors.ink },
  hero: { fontFamily: fonts.display, fontWeight: "800", fontSize: 34, lineHeight: 36, letterSpacing: -1.2, color: colors.ink },
  title: { fontFamily: fonts.display, fontWeight: "800", fontSize: 32, lineHeight: 34, letterSpacing: -1.1, color: colors.ink },
  heading: { fontFamily: fonts.display, fontWeight: "700", fontSize: 17, color: colors.ink },
  button: { fontFamily: fonts.body, fontWeight: "600", fontSize: 16 },
  bodyStrong: { fontFamily: fonts.body, fontWeight: "500", fontSize: 14.5, color: colors.ink },
  body: { fontFamily: fonts.body, fontWeight: "400", fontSize: 14, lineHeight: 21, color: colors.ink },
  meta: { fontFamily: fonts.body, fontWeight: "400", fontSize: 12, color: colors.muted },
  label: { fontFamily: fonts.mono, fontWeight: "500", fontSize: 10, letterSpacing: 1.2, color: colors.muted }, // uppercase section labels
  timer: { fontFamily: fonts.mono, fontWeight: "500", fontSize: 15, fontVariant: ["tabular-nums"] },
} as const;

export const radius = {
  xs: 4,
  sm: 12,
  md: 14, // icon tiles, list buttons
  lg: 18, // info cards
  xl: 22, // content cards
  pill: 29, // 58dp primary buttons
} as const;

// Motion: a strong ease-out for things entering or responding (cubic-bezier(0.23, 1, 0.32, 1)). UI motion stays under 300 ms.
export const easeOut = Easing.bezier(0.23, 1, 0.32, 1);
