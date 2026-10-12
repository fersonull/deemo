/// <reference types="bun" />
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { expect, test } from "bun:test";

const source = readFileSync(`${import.meta.dir}/metro.config.js`, "utf8");

function loadConfig(env: Record<string, string | undefined>) {
  // Exercise our config without starting Metro or loading the developer's .env.local.
  return runInNewContext(source, {
    require: (name: string) => name === "expo/metro-config" ? { getDefaultConfig: () => ({}) } : require(name),
    __dirname: import.meta.dir,
    process: { env: { NODE_ENV: "development", ...env } },
    module: { exports: {} },
  });
}

test("updates cannot export a release bundle without the API URL, even outside EAS Build", () => {
  for (const env of [{ NODE_ENV: "production" }, { EAS_BUILD: "true" }]) {
    expect(() => loadConfig(env)).toThrow("EXPO_PUBLIC_API_URL is not set");
  }
});

test("release exports reject cleartext URLs and accept the public HTTPS API", () => {
  expect(() => loadConfig({ NODE_ENV: "production", EXPO_PUBLIC_API_URL: "http://localhost:3000" })).toThrow("must use HTTPS");
  expect(() => loadConfig({ NODE_ENV: "production", EXPO_PUBLIC_API_URL: "https://api.deemo-ai.com/api" })).not.toThrow();
});

test("local development keeps the USB localhost fallback", () => {
  expect(() => loadConfig({})).not.toThrow();
});
