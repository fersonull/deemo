import { expect, test } from "bun:test";

import { htmlText } from "./docx";

test("mammoth HTML becomes text with figure markers where the images sat", () => {
  const html =
    '<h1>Chapter 3</h1><p>The ERD below &amp; its tables:</p><p><img src="figure:1" /></p><p><img src="" /></p>' +
    "<table><tr><td>Student</td><td>&lt;PK&gt;</td></tr></table>";
  expect(htmlText(html)).toBe("Chapter 3\nThe ERD below & its tables:\n[Figure 1]\n\nStudent\t<PK>");
});
