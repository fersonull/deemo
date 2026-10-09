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

export const MODE_LABELS: Record<Mode, string> = {
  TITLE: "Title Defense",
  PRE_ORAL: "Pre-Oral",
  FINAL: "Final Defense",
};

// Panel personas (addendum Q7): one voice, distinguished by name, role and questioning focus.
export const PANEL = [
  { name: "Reyes", role: "Chair" },
  { name: "Santos", role: "Tech" },
  { name: "Cruz", role: "Methods" },
] as const;

// DEEMO server. Default works over USB with `adb reverse tcp:3000 tcp:3000`; set EXPO_PUBLIC_API_URL for Wi-Fi.
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";
