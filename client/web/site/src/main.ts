// DEEMO's public site: one page of question slips. Content is in index.html (readable with no script); this wires
// the characters, the hero stack, the course picker and the two scroll scenes, and respects reduced motion.
import "./tokens.css";
import "./base.css";
import "./sections.css";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

import { HERO_SLIPS, RELEASES_URL, RUBRIC, type Slip } from "./content";
import { mountCompanion } from "./companion";
import { liveScene } from "./scenes/live";
import { autoHideNav } from "./nav";
import { mountPanel } from "./scenes/panel";
import { readsScene } from "./scenes/reads";
import { reportScene } from "./scenes/report";
import { backInner, slipInner } from "./scenes/slip-html";

gsap.registerPlugin(ScrollTrigger, SplitText);
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector<T>(sel)!;

// ── characters and constants ──
document.querySelectorAll<HTMLAnchorElement>("[data-download]").forEach((a) => (a.href = RELEASES_URL));
$("[data-rubric]").innerHTML = RUBRIC.map(
  (r) => `<tr><th scope="row">${r.name}</th><td>${r.weight}</td><td>${r.level} of 5</td></tr>`,
).join("");

autoHideNav($(".nav"));

// ── hero: the question slips ──
const stackHost = $("[data-stack]");
const announce = $("[data-announce]");
const domSlip = $("[data-dom-slip]");
const say = (top: Slip | null, answered: Slip | null) => {
  const next = top ? `${top.name}, ${top.role}, asks: ${top.q}` : "";
  announce.textContent = answered ? `${answered.name} would follow up: ${answered.follow} ${next}` : next;
};

// Before (or without) WebGL, the top slip is a DOM slip: Next question puts it on the pile with its follow-up face up,
// the way the 3D stack does, and the next question takes the top.
const domPile = $("[data-dom-pile]");
let domIndex = 0;
let next = () => {
  const answered = HERO_SLIPS[domIndex]!;
  domIndex = (domIndex + 1) % HERO_SLIPS.length;
  domSlip.innerHTML = slipInner(HERO_SLIPS[domIndex]!);
  domPile.innerHTML = backInner(answered);
  domPile.hidden = false;
  if (!reduced) gsap.from(domPile, { x: 80, y: -120, rotate: 8, duration: 0.6, ease: "expo.out" });
  say(HERO_SLIPS[domIndex]!, answered);
};
domSlip.innerHTML = slipInner(HERO_SLIPS[0]!);
$("[data-next]").addEventListener("click", () => next());
// Once a slip has been moved, the hint has done its job (and the pile now sits where it was).
stackHost.addEventListener("pointerup", () => stackHost.classList.add("is-used"));
$("[data-next]").addEventListener("click", () => stackHost.classList.add("is-used"));

const webgl = (() => {
  try {
    return !!document.createElement("canvas").getContext("webgl2");
  } catch {
    return false;
  }
})();
const idle = (fn: () => void) => ("requestIdleCallback" in window ? requestIdleCallback(fn, { timeout: 1200 }) : setTimeout(fn, 200));
if (webgl)
  addEventListener("load", () =>
    idle(async () => {
      try {
        const { mountStack } = await import("./hero/stack");
        const stack = await mountStack(stackHost, HERO_SLIPS, { onShow: say, reduced });
        next = stack.next;
      } catch (e) {
        console.warn("Slip stack unavailable, keeping the flat slip:", e);
      }
    }),
  );

// ── the panel, by course ──
mountPanel($("[data-courses]"), $("[data-seats]"), reduced);

// ── the one load moment: the headline sets itself line by line ──
if (!reduced) {
  document.fonts.ready.then(() => {
    const split = SplitText.create(".hero__title", { type: "lines", mask: "lines", autoSplit: true });
    gsap
      .timeline({ defaults: { ease: "expo.out" } })
      .from(split.lines, { yPercent: 105, duration: 1.1, stagger: 0.09 })
      .from([".hero__lead", ".hero__actions", ".hero__fine"], { autoAlpha: 0, y: 14, duration: 0.8, stagger: 0.06 }, 0.35);
  });
}

// ── scroll scenes: scrubbed on wide screens, simpler on phones, still with reduced motion ──
const mm = gsap.matchMedia();
mm.add(
  { wide: "(min-width: 1101px)", phone: "(max-width: 1100px)", reduce: "(prefers-reduced-motion: reduce)" },
  (ctx) => {
    const { wide, reduce } = ctx.conditions as { wide: boolean; phone: boolean; reduce: boolean };
    if (reduce) return;
    if (wide) readsScene($("[data-reads]"));
    liveScene($("[data-live]"), wide ? "scrub" : "play");
  },
);

// The report works its score out once, when it comes into view.
if (!reduced) reportScene($(".card-report"));

// Deemo comes last: its section triggers must be measured after the pinned scenes above add their scroll distance,
// or it changes mood a section early.
mountCompanion(reduced);
ScrollTrigger.refresh();
