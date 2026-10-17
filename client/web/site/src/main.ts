import "./base.css";
import "./sections.css";

import { createDeemo } from "./deemo";
import { initScroll, initSmartNav } from "./scroll";
import { initChapters } from "./sections/chapters";
import { initFaq } from "./sections/faq";
import { initConsistencyDemo } from "./sections/features";
import { initFooter } from "./sections/footer";
import { initHero } from "./sections/hero";
import { initPanelDemo } from "./sections/panel-demo";
import { initPlans } from "./sections/plans";
import { initScope } from "./sections/scope";
import { reducedMotion } from "./utils/motion-pref";

const reduced = reducedMotion();
const scroll = initScroll(reduced);
initSmartNav(document.querySelector<HTMLElement>(".nav")!, scroll.onScroll);

initHero();
initPanelDemo();
initConsistencyDemo();
initChapters();
initScope();
initPlans();
initFaq();
initFooter();

// The footer owl cheers once it's on screen (a reaction to arriving, with no speech bubble).
const footerDeemo = document.getElementById("footer-deemo");
if (footerDeemo) {
  const say = createDeemo(footerDeemo);
  say("idle");
  const io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      say("cheering");
      io.disconnect();
    },
    { threshold: 0.5 },
  );
  io.observe(footerDeemo);
}

// The 3D phone loads after first paint (three.js is its own chunk), so the page is usable immediately.
const canvas = document.querySelector<HTMLCanvasElement>(".phone-canvas")!;
const slots = Array.from(document.querySelectorAll<HTMLElement>(".phone-slot"));
requestAnimationFrame(async () => {
  try {
    const { createPhone } = await import("./three/phone");
    const phone = await createPhone(canvas, slots, reduced);
    scroll.onScroll((s) => phone.setVelocity(s.velocity));
  } catch (err) {
    console.warn("[site] no 3D phone:", err);
    document.documentElement.classList.add("no-webgl");
  }
});
