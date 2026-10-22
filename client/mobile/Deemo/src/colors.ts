// Color tokens from the claude.ai/design prototype, re-exported by theme.ts. Kept free of imports so plain
// TypeScript (the PDF report, tests) can use them too.

// The light theme (the design's own palette).
export const light = {
  // warm paper neutrals
  paper: "#F7F3EC", // screen background
  sand: "#EDE5D8", // cards, inputs, chips
  banner: "#F1E6D6", // info / reconnecting banners
  ink: "#2A2420", // primary text, primary buttons
  inkSoft: "#3E3731", // long-form body text
  inkMuted: "#5E554D", // secondary text
  muted: "#6B6157", // meta text, chevrons; ≥4.5:1 on paper, sand and the tints (was #8A7F74, 3.1–3.5:1)
  faint: "#B0A698", // partial transcript tail
  border: "rgba(42,36,32,0.12)",
  borderStrong: "rgba(42,36,32,0.18)", // dashed "add" outlines
  outline: "rgba(42,36,32,0.35)", // unchecked checkbox
  scrim: "rgba(42,36,32,0.35)", // behind sheets
  handle: "rgba(42,36,32,0.2)", // sheet grab handle
  paperVeil: "rgba(247,243,236,0.94)", // paused overlay
  paperDim: "rgba(247,243,236,0.55)", // inactive tab labels on ink
  // the solid surface for main buttons, selected chips, the tab bar and the Premium card, and what sits on it
  fill: "#2A2420",
  onFill: "#F7F3EC",
  onFillDim: "rgba(247,243,236,0.55)",

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

  // gold: Premium only (Deemo's badge); never a status color
  gold: "#D9A521", // oklch(0.75 0.14 85)
  goldLight: "#F6DC86", // oklch(0.9 0.11 92)
  goldInk: "#8C6310", // oklch(0.52 0.11 75)

  // panel faces (screens/session, components/panel-face): flat skin, hair and mouth tones; never red
  skinLight: "#EDC39B",
  skinLightShade: "#D9A77C",
  skinMid: "#C99168",
  skinMidShade: "#AE7650",
  skinDeep: "#A9714A",
  skinDeepShade: "#8C5937",
  hairGray: "#77706A",
  hairBlack: "#2A2321",
  hairBrown: "#3B2A22",
  mouth: "#5A3329",

  // clay: destructive actions (delete my data), and the lowest readiness band outside a session (never in one)
  clay: "#944123", // oklch(0.48 0.12 40)
  clayTint: "#F5DDD3", // oklch(0.92 0.04 40)

  // the light that lit surfaces catch (theme.ts lit, components/pressable-scale)
  highlight: "rgba(255,255,255,0.7)",
  glow: "rgba(255,255,255,0.32)",
};
export type Palette = typeof light;

// The dark theme: the same roles on warm night ink. Solid surfaces (`fill`) lift to warm charcoal rather than
// flipping to white; tints become deep with light text. Amber still marks contradictions; never red in a session.
// Text pairs are checked at 4.5:1 or better (muted 6.6:1 on paper, 4.9:1 on the dusk tint).
export const dark: Palette = {
  paper: "#1B1815",
  sand: "#27231F",
  banner: "#2E2822",
  ink: "#E8E0D4", // softened: bright enough to read (13:1 on paper) without glaring
  inkSoft: "#D6CCBF",
  inkMuted: "#C2B8AB",
  muted: "#A89D90",
  faint: "#6F665D",
  border: "rgba(242,236,226,0.12)",
  borderStrong: "rgba(242,236,226,0.18)",
  outline: "rgba(242,236,226,0.35)",
  scrim: "rgba(0,0,0,0.55)",
  handle: "rgba(242,236,226,0.25)",
  paperVeil: "rgba(27,24,21,0.94)",
  paperDim: "rgba(27,24,21,0.6)",
  // Main buttons and the tab bar lift to warm charcoal instead of turning white: dark mode, not an inversion.
  fill: "#3A332D",
  onFill: "#F2ECE2",
  onFillDim: "rgba(242,236,226,0.55)",

  dusk: "#8590E3",
  duskIcon: "#9AA3EC",
  duskLink: "#A9B1F0",
  duskInk: "#CDD3FF",
  duskTint: "#2A2E52",
  duskSoft: "#3A3F6E",

  amber: "#EBB353",
  amberInk: "#F2CB82",
  amberTint: "#3B2D16",
  warnInk: "#E8B866",

  sage: "#6FB98A",
  sageInk: "#9FDCB5",
  sageTint: "#1E3528",
  sageSoft: "#2B4A37",

  gold: "#D9A521",
  goldLight: "#F6DC86",
  goldInk: "#C99A2E",

  skinLight: "#EDC39B",
  skinLightShade: "#D9A77C",
  skinMid: "#C99168",
  skinMidShade: "#AE7650",
  skinDeep: "#A9714A",
  skinDeepShade: "#8C5937",
  hairGray: "#77706A",
  hairBlack: "#2A2321",
  hairBrown: "#3B2A22",
  mouth: "#5A3329",

  clay: "#E08B68",
  clayTint: "#3F241A",

  highlight: "rgba(255,255,255,0.07)",
  glow: "rgba(255,255,255,0.03)",
};

// The palette in use. It's filled before any screen builds its styles (utils/theme-choice.ts runs first, from the
// app's entry), so every StyleSheet reads the chosen theme; switching themes saves the choice and reloads the app.
export const colors: Palette = { ...light };
export const applyPalette = (p: Palette) => Object.assign(colors, p);
