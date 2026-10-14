/// <reference types="bun" />
import { expect, test } from "bun:test";

import { avatarUrl, randomSeeds } from "./avatar";

test("the URL asks for the brand colors at one cacheable size", () => {
  const url = new URL(avatarUrl("a1b2c3d4"));
  expect(url.pathname).toBe("/10.x/notionists/png");
  expect(url.searchParams.get("seed")).toBe("a1b2c3d4");
  expect(url.searchParams.get("size")).toBe("256");
  expect(url.searchParams.get("inkColor")).toBe("343996");
  expect(avatarUrl("x")).toContain("backgroundColor=DCE3FF,CFD6F3"); // a plain comma; the API rejects %2C
});

test("random seeds pass the server's check (lowercase hex, 8 characters)", () => {
  const seeds = randomSeeds(20);
  expect(seeds).toHaveLength(20);
  for (const s of seeds) expect(s).toMatch(/^[0-9a-f]{8}$/);
});
