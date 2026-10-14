import { colors } from "@/colors";

// Avatars from DiceBear's HTTP API (dicebear.com, 10.x): the "notionists" style, hand-drawn like the app, inked in dusk
// on paper over the dusk tints. CC0, so no attribution. The seed is the student's pick, saved on their account
// (users/{uid}.avatar; the server makes a default from a hash of the uid), so teammates see the same face and
// DiceBear never sees an ID, name or email. One PNG size everywhere (the API's 256 px cap), so a face downloads once
// and React Native's image cache serves it on every screen.
const hex = (c: string) => c.replace("#", "");

// Built by hand: every value is hex or digits, and the API rejects a list whose comma is encoded (%2C), which
// URLSearchParams would do.
export function avatarUrl(seed: string) {
  const q = {
    seed,
    size: 256,
    inkColor: hex(colors.duskInk),
    paperColor: hex(colors.paper),
    backgroundColor: [colors.duskTint, colors.duskSoft].map(hex).join(","),
  };
  return `https://api.dicebear.com/10.x/notionists/png?${Object.entries(q).map(([k, v]) => `${k}=${v}`).join("&")}`;
}

// FNV-1a, 32-bit, as 8 hex characters: the same shape as the server's default seed (server/src/modules/identity/domain/account.ts).
function fnv(s: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(16).padStart(8, "0");
}

// The picker's faces come in fixed pages, the same for everyone, so a page seen once is served from the image cache
// on every later visit; only pages never seen before are downloaded. `keep` (the current or picked face) goes first
// and isn't repeated.
export const PAGE_SIZE = 8; // under DiceBear's 10 PNGs/second
export function pageOfFaces(page: number, keep: string | null) {
  const deal = Array.from({ length: PAGE_SIZE + 1 }, (_, i) => fnv(`deal-${page}-${i}`)).filter((s) => s !== keep);
  return [...(keep ? [keep] : []), ...deal.slice(0, keep ? PAGE_SIZE : PAGE_SIZE + 1)];
}
