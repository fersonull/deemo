// Color tokens from the claude.ai/design prototype, re-exported by theme.ts. Kept free of imports so plain
// TypeScript (the PDF report, tests) can use them too.

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

  // clay: destructive actions (delete my data), and the lowest readiness band outside a session (never in one)
  clay: "#944123", // oklch(0.48 0.12 40)
  clayTint: "#F5DDD3", // oklch(0.92 0.04 40)
} as const;
