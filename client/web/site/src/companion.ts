// Deemo as a companion: one owl for the whole page. It starts perched on the hero's slip stack, glides down to a dock
// in the corner once the hero scrolls away, keeps you company there (a mood and a short line per section, from the
// section's data-mood / data-say), and flies up to the middle of the close to cheer. Every flight is tied to scroll
// position, so scrolling back up reverses it. It never takes pointer events.
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { createDeemo, type DeemoMood } from "./deemo";

gsap.registerPlugin(ScrollTrigger);

type Box = { x: number; y: number; w: number };
const lerpBox = (a: Box, b: Box, t: number): Box => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, w: a.w + (b.w - a.w) * t });
const boxOf = (el: HTMLElement): Box => {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width };
};

export function mountCompanion(reduced: boolean) {
  const el = document.querySelector<HTMLElement>(".companion")!;
  const heroSpot = document.querySelector<HTMLElement>(".stack__owl")!;
  const closeSpot = document.querySelector<HTMLElement>(".close__owl")!;
  const say = createDeemo(el);
  say("reading"); // drawn before any section reports in
  const ease = gsap.parseEase("power2.inOut");

  // Flight progress: hero perch → dock as the hero leaves, dock → close as the close arrives.
  const flight = { out: 0, home: 0 };
  ScrollTrigger.create({ trigger: ".hero", start: "bottom 80%", end: "bottom 30%", onUpdate: (s) => (flight.out = s.progress) });
  ScrollTrigger.create({ trigger: ".close", start: "top 85%", end: "top 35%", onUpdate: (s) => (flight.home = s.progress) });

  const dock = (): Box => {
    const w = el.offsetWidth; // the docked size; the perches are larger and scale the owl up
    return { x: innerWidth - w - Math.min(32, innerWidth * 0.05), y: innerHeight - w * 1.06 - 24, w };
  };

  let at: Box | null = null;
  let last = performance.now();
  const place = () => {
    const now = performance.now();
    const dt = Math.min(1000, now - last); // real elapsed time (gsap smooths long frames, which would stall the follow)
    last = now;
    let to = lerpBox(boxOf(heroSpot), dock(), ease(flight.out));
    to = lerpBox(to, boxOf(closeSpot), ease(flight.home));
    // A little lag behind the scroll reads as following, not glued; reduced motion tracks exactly.
    // Time-based, so it settles at the same pace on a 60 Hz laptop and a throttled phone.
    at = !at || reduced ? to : lerpBox(at, to, 1 - Math.pow(0.82, dt / 16.7));
    gsap.set(el, { x: at.x, y: at.y, scale: at.w / el.offsetWidth });
    el.toggleAttribute("data-docked", flight.out > 0.96 && flight.home < 0.04);
  };
  gsap.ticker.add(place);

  // Section by section: a mood, and a line that shows for a few seconds while docked.
  let hush: gsap.core.Tween | null = null;
  document.querySelectorAll<HTMLElement>("[data-mood]").forEach((section) =>
    ScrollTrigger.create({
      trigger: section,
      start: "top 55%",
      end: "bottom 55%",
      onToggle: (s) => {
        if (!s.isActive) return;
        const line = section.dataset.say ?? "";
        say(section.dataset.mood as DeemoMood, line);
        hush?.kill();
        if (line) hush = gsap.delayedCall(5, () => el.toggleAttribute("data-quiet", true));
      },
    }),
  );
}
