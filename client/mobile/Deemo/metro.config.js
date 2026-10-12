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

// An EAS build without the server URL would ship an app that can only call localhost, which release builds refuse.
if (process.env.EAS_BUILD && !process.env.EXPO_PUBLIC_API_URL) {
  throw new Error("EXPO_PUBLIC_API_URL is not set for this EAS build. Add it to the build profile's environment.");
}

module.exports = config;
