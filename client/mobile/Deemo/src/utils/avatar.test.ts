/// <reference types="bun" />
import { expect, test } from "bun:test";

import { avatarUrl, pageOfFaces } from "./avatar";

test("the URL asks for the brand colors at one cacheable size", () => {
  const url = new URL(avatarUrl("a1b2c3d4"));
  expect(url.pathname).toBe("/10.x/notionists/png");
  expect(url.searchParams.get("seed")).toBe("a1b2c3d4");
  expect(url.searchParams.get("size")).toBe("256");
  expect(url.searchParams.get("inkColor")).toBe("343996");
  expect(avatarUrl("x")).toContain("backgroundColor=DCE3FF,CFD6F3"); // a plain comma; the API rejects %2C
});

test("pages of faces are fixed, so a page seen once comes from the cache", () => {
  expect(pageOfFaces(0, null)).toEqual(pageOfFaces(0, null));
  expect(pageOfFaces(1, null)).not.toEqual(pageOfFaces(0, null));
  for (const s of pageOfFaces(3, null)) expect(s).toMatch(/^[0-9a-f]{8}$/); // passes the server's check
});

test("the kept face leads the page once, and a page is always nine faces", () => {
  const first = pageOfFaces(0, null);
  expect(first).toHaveLength(9);
  const keepOwn = pageOfFaces(0, "abc12345");
  expect(keepOwn[0]).toBe("abc12345");
  expect(keepOwn).toHaveLength(9);
  const keepFromPage = pageOfFaces(0, first[2]); // already on this page: not repeated
  expect(new Set(keepFromPage).size).toBe(9);
  expect(keepFromPage[0]).toBe(first[2]);
});
