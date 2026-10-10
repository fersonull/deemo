// Tokens from the claude.ai/design prototype (docs/design/DEEMO Prototype.dc.html).
// oklch values converted to hex because React Native can't parse oklch().
// ponytail: light theme only — the prototype has no dark palette yet; add one when it's designed.

import { Easing } from "react-native-reanimated";

export const colors = {
  // warm paper neutrals
  paper: "#F7F3EC", // screen background
  sand: "#EDE5D8", // cards, inputs, chips
  banner: "#F1E6D6", // info / reconnecting banners
  ink: "#2A2420", // primary text, primary buttons
  inkSoft: "#3E3731", // long-form body text
  inkMuted: "#5E554D", // secondary text
  muted: "#8A7F74", // meta text, chevrons
  faint: "#B0A698", // partial transcript tail
  border: "rgba(42,36,32,0.12)",

  // primary: "dusk" indigo
  dusk: "#5A66C7", // oklch(0.55 0.15 275)
  duskIcon: "#4D57B7", // oklch(0.5 0.15 275)
  duskLink: "#4851B0", // oklch(0.48 0.15 275)
  duskInk: "#343996", // oklch(0.4 0.15 275), text on duskTint
  duskTint: "#DCE3FF", // oklch(0.92 0.04 275)
  duskSoft: "#CFD6F3", // oklch(0.88 0.04 275)

  // amber: contradictions, low-confidence AI (never red during a session)
  amber: "#EBB353", // oklch(0.8 0.13 78)
  amberInk: "#6C4302", // oklch(0.42 0.09 70)
  amberTint: "#F7E1C0", // oklch(0.92 0.05 78)
  warnInk: "#875814", // oklch(0.5 0.1 70)

  // sage: success / checks passed
  sage: "#4A9266", // oklch(0.6 0.1 155)
  sageInk: "#2A7449", // oklch(0.5 0.1 155)
  sageTint: "#CBEFD6", // oklch(0.92 0.05 155)
  sageSoft: "#BEE2C9", // oklch(0.88 0.05 155)

  // clay: destructive actions only (delete my data)
  clay: "#944123", // oklch(0.48 0.12 40)
} as const;

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
