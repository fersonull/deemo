// The report works its score out in front of you, once: the formula's terms arrive in order (rubric, coverage,
// consistency penalty, result) while the big number counts from the rubric score down to the readiness score. The
// page's markup already holds the final state, so without this (or with reduced motion) nothing is missing.
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { SCORE } from "../content";

export function reportScene(card: HTMLElement) {
  const terms = card.querySelectorAll<HTMLElement>("[data-formula] span");
  const num = card.querySelector<HTMLElement>("[data-score]")!;
  const count = { v: SCORE.rubric };

  gsap.set(terms, { autoAlpha: 0, y: 6 });
  num.textContent = String(SCORE.rubric);
  const tl = gsap
    .timeline({ paused: true, defaults: { duration: 0.2, ease: "expo.out" } })
    .to(terms, { autoAlpha: 1, y: 0, stagger: 0.08 })
    // the count lands with the "= 71" term: 76 → 71 as the penalty is taken off
    .to(count, { v: SCORE.readiness, duration: 0.6, ease: "power2.out", onUpdate: () => (num.textContent = String(Math.round(count.v))) }, 0.04);

  ScrollTrigger.create({ trigger: card, start: "top 70%", once: true, onEnter: () => void tl.play() });
}
