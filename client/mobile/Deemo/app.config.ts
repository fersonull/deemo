import type { ConfigContext, ExpoConfig } from "expo/config";

// app.json stays the source of truth; this only fills in what must come from the environment.
// EAS builds can't see the gitignored google-services.json, so they get it as the file variable GOOGLE_SERVICES_JSON;
// local builds fall back to the file next to this one.
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? "Deemo",
  slug: config.slug ?? "Deemo",
  android: {
    ...config.android,
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json",
  },
});