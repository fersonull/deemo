// The panel, profiled by course: the app's real lineup (panel-data.ts). Picking a course re-seats the field expert
// (title, role and what they press on) and re-deals the note slips under each panelist.
import gsap from "gsap";

import { COURSES, panelFor, type Course } from "../panel-data";
import { panelFaceSVG } from "../panel-face";

export function mountPanel(chips: HTMLElement, seats: HTMLElement, reduced: boolean) {
  let course: Course = "BSIT";

  const renderSeats = (animate: boolean) => {
    seats.innerHTML = panelFor(course, 3)
      .map(
        (p) => `<li class="seat">
          <div class="face">${panelFaceSVG(p.persona)}</div>
          <p class="seat__name">${p.name}</p>
          <p class="seat__role">${p.role}</p>
          <div class="slip"><p class="seat__label">Presses on</p><p class="slip__q">${p.focus}</p></div>
        </li>`,
      )
      .join("");
    if (animate && !reduced)
      gsap.from(seats.querySelectorAll(".slip"), { y: 28, rotate: -2, autoAlpha: 0, duration: 0.6, stagger: 0.07, ease: "expo.out" });
  };

  chips.innerHTML = COURSES.map(
    (c) => `<button type="button" class="chip" role="radio" aria-checked="${c === course}" tabindex="${c === course ? 0 : -1}" data-course="${c}">${c}</button>`,
  ).join("");
  const buttons = [...chips.querySelectorAll<HTMLButtonElement>(".chip")];

  const pick = (b: HTMLButtonElement, focus = false) => {
    if (b.dataset.course === course) return;
    course = b.dataset.course as Course;
    for (const x of buttons) {
      const on = x === b;
      x.setAttribute("aria-checked", String(on));
      x.tabIndex = on ? 0 : -1;
    }
    if (focus) b.focus();
    renderSeats(true);
  };

  chips.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>(".chip");
    if (b) pick(b);
  });
  // A radio group: arrow keys move the choice.
  chips.addEventListener("keydown", (e) => {
    const i = buttons.findIndex((b) => b.dataset.course === course);
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    pick(buttons[(i + step + buttons.length) % buttons.length]!, true);
  });

  renderSeats(false);
}
