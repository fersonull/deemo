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
