// "Out loud, with follow-ups": the exchange plays one beat at a time, scrubbed by scroll on desktop and played once
// when it comes into view on phones. The status line says who has the floor, as the app's session screen does.
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const STATUS = [
  "Prof. Cruz is asking",
  "Your turn. Tap when you're done.",
  "Prof. Cruz follows up",
  "Your turn. Tap when you're done.",
  "Prof. Cruz is asking about Chapter 3",
];

export function liveScene(root: HTMLElement, mode: "scrub" | "play") {
  const beats = [...root.querySelectorAll<HTMLElement>("[data-beat]")];
  const status = root.querySelector<HTMLElement>("[data-status]")!;
  const wave = root.querySelector<HTMLElement>("[data-wave]")!;
  const time = root.querySelector<HTMLElement>("[data-time]")!;
  let shown = -1;

  const show = (b: number) => {
    if (b === shown) return;
    shown = b;
    status.textContent = STATUS[b]!;
    wave.classList.add("is-on"); // someone always has the floor
    const secs = 8 * 60 + 41 + b * 23;
    time.textContent = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
  };

  gsap.set(beats.slice(1), { autoAlpha: 0, y: 18 });
  const tl = gsap.timeline({ paused: mode === "play", defaults: { duration: 0.6, ease: "expo.out" } });
  beats.slice(1).forEach((el, i) => {
    tl.to(el, { autoAlpha: 1, y: 0, onStart: () => show(i + 1), onReverseComplete: () => show(i) }, mode === "play" ? i * 1.4 + 0.8 : i + 0.5);
  });
  show(0);
  if (mode === "scrub") tl.to({}, { duration: 1 }); // a beat of stillness on the contradiction before the pin lets go

  if (mode === "scrub") {
    ScrollTrigger.create({ trigger: root, start: "center center", end: "+=180%", pin: true, scrub: 0.5, animation: tl });
  } else {
    ScrollTrigger.create({ trigger: root, start: "top 65%", once: true, onEnter: () => void tl.play() });
  }
}
