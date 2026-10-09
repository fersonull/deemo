// Adaptive Domain Profiling options (plan F4).
export const DOMAINS = [
  "Web/Mobile App",
  "Networking & Security",
  "Data & AI",
  "IoT/Hardware",
  "Information Systems",
] as const;

export type Domain = (typeof DOMAINS)[number];

// Session data model values (plan §13).
export type Mode = "TITLE" | "PRE_ORAL" | "FINAL";
