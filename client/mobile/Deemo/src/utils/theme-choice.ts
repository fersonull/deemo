import { File, Paths } from "expo-file-system";
import * as SystemUI from "expo-system-ui";
import * as Updates from "expo-updates";
import { DevSettings } from "react-native";

import { applyPalette, colors, dark } from "@/colors";

// Light or dark, chosen in Profile and kept on the phone. This module runs first (index.ts), before any screen builds
// its styles, so every StyleSheet reads the chosen palette. Changing it saves the choice and reloads the app, which
// rebuilds every style in the new theme; the student stays signed in.
export type ThemeName = "light" | "dark";

const file = () => new File(Paths.document, "theme");

function saved(): ThemeName {
  try {
    const f = file();
    return f.exists && f.textSync().trim() === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export const theme: ThemeName = saved();
if (theme === "dark") applyPalette(dark);
// The window behind the app (no flash of the wrong color while screens load or animate).
void SystemUI.setBackgroundColorAsync(colors.paper).catch(() => {});

export async function chooseTheme(next: ThemeName) {
  if (next === theme) return;
  try {
    file().write(next);
  } catch {
    return; // can't save it, so a reload would come back in the old theme
  }
  if (__DEV__) return DevSettings.reload();
  // A build without in-app reload still has the choice saved: it applies the next time the app opens.
  await Updates.reloadAsync().catch(() => {});
}
