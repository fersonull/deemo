/// <reference types="bun" />
import { expect, test } from "bun:test";

import { colors } from "@/colors";

import { bandOf, deltaTone } from "./bands";

test("scores fall into the server's bands at 85, 70 and 50", () => {
  expect(bandOf(100).name).toBe("Defense-ready");
  expect(bandOf(85).name).toBe("Defense-ready");
  expect(bandOf(84).name).toBe("Nearly ready");
  expect(bandOf(70).name).toBe("Nearly ready");
  expect(bandOf(69).name).toBe("Developing");
  expect(bandOf(50).name).toBe("Developing");
  expect(bandOf(49).name).toBe("Needs preparation");
  expect(bandOf(0).name).toBe("Needs preparation");
});

test("each band carries its status colors", () => {
  expect(bandOf(90).fill).toBe(colors.sage);
  expect(bandOf(75).fill).toBe(colors.dusk);
  expect(bandOf(60).fill).toBe(colors.amber);
  expect(bandOf(10).fill).toBe(colors.clay);
});

test("a rise is sage, a drop is amber (never red), no change is neutral", () => {
  expect(deltaTone(7).ink).toBe(colors.sageInk);
  expect(deltaTone(-3).ink).toBe(colors.amberInk);
  expect(deltaTone(0).icon).toBe("");
});
