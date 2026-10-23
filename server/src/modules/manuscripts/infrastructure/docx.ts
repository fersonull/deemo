import mammoth from "mammoth";

import { Rejected } from "../domain/manuscript";

// A DOCX as plain text (PDFs and photos go to Gemini as-is). The file only lives in memory for this call.
export async function docxText(bytes: Uint8Array, unreadable: string): Promise<string> {
  return mammoth
    .extractRawText({ buffer: Buffer.from(bytes) })
    .then((r) => r.value)
    .catch(() => {
      throw new Rejected(unreadable);
    });
}

// Gemini can't see a DOCX, so its figures (ERDs, DFDs, architecture, charts) go along as images, each marked
// "[Figure n]" where it sits in the text so the analysis knows its chapter. Icons and logos are skipped, and the
// images are capped so the request stays small.
// ponytail: EMF/WMF (Visio exports) are skipped; convert them if students' diagrams keep going missing.
const READABLE = new Set(["image/png", "image/jpeg", "image/webp"]);
const MIN_IMAGE = 8 * 1024;
const MAX_IMAGES = 30;
const MAX_IMAGE_BYTES = 15 * 1024 * 1024; // inline, and re-sent if a fallback model takes over
export type DocxImage = { mimeType: string; data: string };

export async function docxContent(bytes: Uint8Array, unreadable: string): Promise<{ text: string; images: DocxImage[] }> {
  const images: DocxImage[] = [];
  let total = 0;
  const convertImage = mammoth.images.imgElement(async (image) => {
    if (!READABLE.has(image.contentType) || images.length >= MAX_IMAGES) return { src: "" };
    const buf = await image.readAsBuffer();
    if (buf.length < MIN_IMAGE || total + buf.length > MAX_IMAGE_BYTES) return { src: "" };
    total += buf.length;
    images.push({ mimeType: image.contentType, data: buf.toString("base64") });
    return { src: `figure:${images.length}` };
  });
  const html = await mammoth
    .convertToHtml({ buffer: Buffer.from(bytes) }, { convertImage })
    .then((r) => r.value)
    .catch(() => {
      throw new Rejected(unreadable);
    });
  return { text: htmlText(html), images };
}

// mammoth's HTML as plain text: one line per block, figure markers kept, its few entities decoded.
export const htmlText = (html: string) =>
  html
    .replace(/<img[^>]*src="figure:(\d+)"[^>]*>/g, "[Figure $1]")
    .replace(/<\/(p|h\d|li|tr|table)>|<br\s*\/?>/g, "\n")
    .replace(/<\/t[dh]>/g, "\t")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
