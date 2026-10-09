// Live API audio + frame codecs. Hermes has no TextDecoder/atob guarantee, so these are hand-rolled
// on typed arrays (also faster than going through binary strings).

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const LOOKUP = new Uint8Array(128);
for (let i = 0; i < ALPHABET.length; i++) LOOKUP[ALPHABET.charCodeAt(i)] = i;

export function toBase64(bytes: Uint8Array): string {
  let out = "";
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out += ALPHABET[n >> 18] + ALPHABET[(n >> 12) & 63] + ALPHABET[(n >> 6) & 63] + ALPHABET[n & 63];
  }
  const rest = bytes.length - i;
  if (rest === 1) {
    const n = bytes[i] << 16;
    out += ALPHABET[n >> 18] + ALPHABET[(n >> 12) & 63] + "==";
  } else if (rest === 2) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8);
    out += ALPHABET[n >> 18] + ALPHABET[(n >> 12) & 63] + ALPHABET[(n >> 6) & 63] + "=";
  }
  return out;
}

export function fromBase64(s: string): Uint8Array {
  const pad = s.endsWith("==") ? 2 : s.endsWith("=") ? 1 : 0;
  const out = new Uint8Array((s.length / 4) * 3 - pad);
  let o = 0;
  for (let i = 0; i < s.length; i += 4) {
    const n =
      (LOOKUP[s.charCodeAt(i)] << 18) |
      (LOOKUP[s.charCodeAt(i + 1)] << 12) |
      (LOOKUP[s.charCodeAt(i + 2)] << 6) |
      LOOKUP[s.charCodeAt(i + 3)];
    out[o++] = n >> 16;
    if (o < out.length) out[o++] = (n >> 8) & 255;
    if (o < out.length) out[o++] = n & 255;
  }
  return out;
}

// Mic floats (-1..1) -> base64 16-bit little-endian PCM for realtimeInput.audio.
export function encodePcm16(samples: Float32Array): string {
  const bytes = new Uint8Array(samples.length * 2);
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(i * 2, v < 0 ? v * 0x8000 : v * 0x7fff, true);
  }
  return toBase64(bytes);
}

// base64 16-bit little-endian PCM (the panel's 24 kHz voice) -> floats for an AudioBuffer.
export function decodePcm16(b64: string): Float32Array<ArrayBuffer> {
  const bytes = fromBase64(b64);
  const view = new DataView(bytes.buffer);
  const out = new Float32Array(bytes.length >> 1);
  for (let i = 0; i < out.length; i++) out[i] = view.getInt16(i * 2, true) / 0x8000;
  return out;
}

// Live API frames arrive binary. Mostly ASCII (base64 audio), so decode ASCII runs in chunks.
export function utf8(bytes: Uint8Array): string {
  let out = "";
  let i = 0;
  while (i < bytes.length) {
    let j = i;
    while (j < bytes.length && j - i < 4096 && bytes[j] < 0x80) j++;
    if (j > i) {
      out += String.fromCharCode.apply(null, bytes.subarray(i, j) as unknown as number[]);
      i = j;
      continue;
    }
    const b = bytes[i++];
    const cp =
      b < 0xe0
        ? ((b & 31) << 6) | (bytes[i++] & 63)
        : b < 0xf0
          ? ((b & 15) << 12) | ((bytes[i++] & 63) << 6) | (bytes[i++] & 63)
          : ((b & 7) << 18) | ((bytes[i++] & 63) << 12) | ((bytes[i++] & 63) << 6) | (bytes[i++] & 63);
    out += String.fromCodePoint(cp);
  }
  return out;
}
