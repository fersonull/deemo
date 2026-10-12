// Learn more https://docs.expo.dev/guides/customizing-metro
const { createHash } = require("node:crypto");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Release bundles inline EXPO_PUBLIC_* values into the code, but Metro's transform cache key doesn't include them,
// and builds in CI (EAS) reuse that cache. A build made before EXPO_PUBLIC_API_URL was set kept handing later builds
// the localhost fallback from src/constants.ts. Hashing the values into the transformer config (which is part of the
// cache key) makes any change to them invalidate the cached transforms.
const publicEnv = Object.keys(process.env)
  .filter((key) => key.startsWith("EXPO_PUBLIC_"))
  .sort()
  .map((key) => `${key}=${process.env[key]}`)
  .join("\n");
config.transformer = {
  ...config.transformer,
  publicEnvHash: createHash("sha256").update(publicEnv).digest("hex"),
};

// EAS Update exports run outside EAS Build; both must reject the localhost fallback.
if ((process.env.EAS_BUILD || process.env.NODE_ENV === "production") && !process.env.EXPO_PUBLIC_API_URL) {
  throw new Error("EXPO_PUBLIC_API_URL is not set. Select the EAS environment for this build or update.");
}
if (process.env.NODE_ENV === "production" && !process.env.EXPO_PUBLIC_API_URL.startsWith("https://")) {
  throw new Error("EXPO_PUBLIC_API_URL must use HTTPS for release builds and updates.");
}

module.exports = config;
