// Chapter 03's "Build your panel" demo. Picking a course re-runs the same seating logic the app ships
// (panel-data.ts) and redraws the panel with the real faces (panel-face.ts). Proof, not a mockup.
import gsap from "gsap";

import { panelFaceSVG } from "../panel-face";
import { COURSES, panelFor, type Course } from "../panel-data";
import { reducedMotion } from "../utils/motion-pref";

export function initPanelDemo() {
  const chipsEl = document.getElementById("course-chips");
  const listEl = document.getElementById("panel-demo");
  if (!chipsEl || !listEl) return;

  chipsEl.innerHTML = COURSES.map(
    (c) => `<button type="button" class="chip" role="radio" aria-pressed="${c === "BSIT"}" data-course="${c}">${c}</button>`,
  ).join("");

  function render(course: Course, animate: boolean) {
    chipsEl!.querySelectorAll<HTMLButtonElement>(".chip").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.course === course)));
    listEl!.innerHTML = panelFor(course, 3)
      .map(
        (p) => `<li>
          <span class="panel-demo__face">${panelFaceSVG(p.persona)}</span>
          <span><span class="panel-demo__name">${p.name}</span><span class="panel-demo__role">${p.role}</span>
          <span class="panel-demo__focus">Asks about ${p.focus}.</span></span>
        </li>`,
      )
      .join("");
    // A direct response to the tap (not an entrance effect): the new panel settles into place.
    if (animate && !reducedMotion())
      gsap.from(listEl!.children, { scale: 0.97, duration: 0.32, stagger: 0.04, ease: "back.out(2)", transformOrigin: "50% 50%" });
  }

  chipsEl.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-course]");
    if (btn) render(btn.dataset.course as Course, true);
  });
  render("BSIT", false);
}
