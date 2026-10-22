// The nav on both pages: a paper backing once the page has moved, out of the way while reading down, back as soon as
// the reader scrolls up (or tabs into it, see .nav:focus-within). Driven by ScrollTrigger's direction, not a raw
// scroll listener.
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function autoHideNav(nav: HTMLElement) {
  const update = (y: number, direction: number) => {
    nav.classList.toggle("is-scrolled", y > 8);
    if (y < 160 || direction < 0) nav.classList.remove("is-hidden");
    else if (direction > 0) nav.classList.add("is-hidden");
  };
  ScrollTrigger.create({ start: 0, end: "max", onUpdate: (self) => update(self.scroll(), self.direction) });
  update(window.scrollY, 0);
}
