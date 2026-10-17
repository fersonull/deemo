// The hero's Deemo: waving hello beside the headline. The bubble's words are in index.html.
import { createDeemo } from "../deemo";

export function initHero() {
  const root = document.getElementById("hero-deemo");
  if (root) createDeemo(root)("waving", root.querySelector(".deemo__say")?.textContent ?? "");
}
