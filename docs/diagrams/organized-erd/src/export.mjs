import assert from "node:assert/strict";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const { chromium } = createRequire(import.meta.url)("playwright");
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? `${process.env.ProgramFiles}/Google/Chrome/Application/chrome.exe`,
  headless: true,
});
const checks = [];
try {
  const files = readdirSync(".").filter((f) => f.endsWith(".svg")).sort();
  assert.equal(files.length, 1, "Export only the continuous ERD");
  const page = await (await browser.newContext({ deviceScaleFactor: 2 })).newPage();
  for (const file of files) {
    const svg = readFileSync(file, "utf8");
    assert(!/NaN|undefined/.test(svg));
    const [, w, h] = svg.match(/width="(\d+)" height="(\d+)"/);
    await page.setViewportSize({ width: +w, height: +h });
    await page.setContent(`<html><style>html,body{margin:0}svg{display:block}</style>${svg}</html>`);
    await page.evaluate(() => document.fonts.ready);
    const result = await page.evaluate(() => {
      const svg = document.querySelector("svg");
      const outer = svg.getBoundingClientRect();
      const labels = [...svg.querySelectorAll("text")].map((el) => {
        const { x, y, width: w, height: h } = el.getBoundingClientRect();
        return { text: el.textContent, x, y, w, h, size: +el.getAttribute("font-size") };
      });
      const clipped = labels.filter((r) => r.x < 0 || r.y < 0 || r.x + r.w > outer.width || r.y + r.h > outer.height);
      const overlaps = labels.flatMap((r, i) => labels.slice(i + 1).filter((s) =>
        Math.min(r.x + r.w, s.x + s.w) - Math.max(r.x, s.x) > 2 &&
        Math.min(r.y + r.h, s.y + s.h) - Math.max(r.y, s.y) > 2,
      ).map((s) => [r.text, s.text]));
      const outsideTables = [...svg.querySelectorAll("g[data-entity]")].flatMap((g) => {
        const box = g.querySelector("rect").getBoundingClientRect();
        return [...g.querySelectorAll("text")].filter((el) => {
          const r = el.getBoundingClientRect();
          return r.left < box.left || r.right > box.right || r.top < box.top || r.bottom > box.bottom;
        }).map((el) => el.textContent);
      });
      return { labels: labels.length, tables: svg.querySelectorAll("g[data-entity]").length, relations: svg.querySelectorAll("g[data-relation]").length, minFont: Math.min(...labels.map((r) => r.size)), clipped, overlaps, outsideTables };
    });
    checks.push({ file, width: +w, height: +h, ...result });
    assert.equal(result.clipped.length, 0, `${file}: clipped text ${JSON.stringify(result.clipped)}`);
    assert.equal(result.overlaps.length, 0, `${file}: overlapping text ${JSON.stringify(result.overlaps)}`);
    assert.equal(result.outsideTables.length, 0, `${file}: text outside a box`);
    assert(result.minFont >= 20);
    assert.equal(result.tables, 22);
    assert.equal(result.relations, 24);
    assert(!svg.includes("data-reference"), "No reference chips");
    await page.screenshot({ path: file.replace(/\.svg$/, ".png") });
    console.log(`${file}: ${result.tables} full tables, ${result.relations} relationships; text checks pass`);
  }
  const file = files[0];
  writeFileSync("index.html", `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DEEMO — continuous ERD</title><style>body{max-width:1500px;margin:40px auto;padding:0 24px;font:18px/1.6 Arial,sans-serif;color:#172033;background:white}h1{font-size:36px}a{color:#354b82}img{display:block;width:100%;height:auto}a:focus-visible{outline:3px solid #354b82;outline-offset:4px}</style><h1>DEEMO — continuous ERD</h1><p>All 22 tables and 24 direct relationships in one diagram. No reference chips, line crossings or shared line segments. The two support tables have no database relationships.</p><p><a href="${file}">Open vector SVG to zoom</a> · <a href="${file.replace(/\.svg$/, ".png")}">Open high-resolution PNG</a></p><a href="${file}"><img src="${file}" alt="DEEMO continuous ERD with 22 tables and 24 direct relationships"></a></html>\n`);
} finally {
  writeFileSync("text-checks.json", JSON.stringify(checks, null, 2) + "\n");
  await browser.close();
}
