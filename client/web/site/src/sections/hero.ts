// The hero's "Build your panel" demo — the site's signature interaction (see docs/DEEMO_SITE_PLAN.md). Picking a
// course re-runs the SAME lineup logic the app ships (panel-data.ts), then redraws the panel cards with the real
// faces (panel-face.ts). Proof, not a mockup.
import gsap from "gsap";

import { createDeemo } from "../deemo";
import { panelFaceSVG } from "../panel-face";
import { COURSES, panelFor, type Course } from "../panel-data";
import { reducedMotion } from "../utils/motion-pref";

const DEFAULT_COURSE: Course = "BSIT";

export function initHero() {
  const chipsEl = document.getElementById("course-chips")!;
  const demoEl = document.getElementById("panel-demo")!;
  const deemoRoot = document.getElementById("hero-deemo")!;
  const say = createDeemo(deemoRoot);

  chipsEl.innerHTML = COURSES.map(
    (c) => `<button type="button" class="chip" role="radio" aria-pressed="${c === DEFAULT_COURSE}" data-course="${c}">${c}</button>`,
  ).join("");

  function render(course: Course, animate: boolean) {
    chipsEl.querySelectorAll<HTMLButtonElement>(".chip").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.course === course)));

    const panel = panelFor(course, 3);
    const cards = panel
      .map(
        (p) => `<li>
          <span class="panel-demo__face">${panelFaceSVG(p.persona)}</span>
          <span>
            <span class="panel-demo__name">${p.name}</span><br/>
            <span class="panel-demo__role">${p.role}</span>
            <span class="panel-demo__focus">Asks about ${p.focus}.</span>
          </span>
        </li>`,
      )
      .join("");

    if (!animate || reducedMotion()) {
      demoEl.innerHTML = cards;
    } else {
      gsap.to(demoEl, {
        opacity: 0,
        y: 6,
        duration: 0.14,
        ease: "power2.in",
        onComplete: () => {
          demoEl.innerHTML = cards;
          gsap.fromTo(demoEl, { opacity: 0, y: -6 }, { opacity: 1, y: 0, duration: 0.32, ease: "power2.out" });
          gsap.from(demoEl.children, { opacity: 0, y: 10, duration: 0.3, stagger: 0.05, ease: "power2.out", delay: 0.05 });
        },
      });
    }

    const field = course === "Other" ? "your field" : course;
    say("encouraging", `Meet your panel for ${field}.`);
  }

  chipsEl.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-course]");
    if (!btn) return;
    render(btn.dataset.course as Course, true);
  });

  render(DEFAULT_COURSE, false);
  setTimeout(() => say("waving", "Pick your course — I'll build your panel."), 400);
}
