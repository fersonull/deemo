// Slide navigation, GSAP slide transitions, and the phone hand-off between slides.
import { createDeemo } from "./deemo.js";
import { createPhone } from "./phone.js";

const stage = document.getElementById("stage");
const slides = [...document.querySelectorAll(".slide")];
const count = document.getElementById("count");
const progress = document.getElementById("progress");
const flowButtons = [...document.querySelectorAll("#flowSteps button")];
const flowSlide = slides.findIndex((s) => s.contains(flowButtons[0]));
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const pad = (n) => String(n).padStart(2, "0");

// Landscape: a 1920×1080 stage. Portrait (phones): a 720-wide stage as tall as the screen's shape
// allows, with its own layouts (.portrait in styles.css). Runs before the phone's resize handler.
function fit() {
  const portrait = innerWidth < innerHeight * 0.9;
  document.documentElement.classList.toggle("portrait", portrait);
  const w = portrait ? 720 : 1920;
  const h = portrait ? Math.round(Math.min(Math.max((w * innerHeight) / innerWidth, 1180), 1600)) : 1080;
  stage.style.width = `${w}px`;
  stage.style.height = `${h}px`;
  stage.style.setProperty("--s", Math.min(innerWidth / w, innerHeight / h));
}
fit();
addEventListener("resize", fit);

// WebGL can fail (old GPU, blocked context); the deck still works without the phone.
let phone = null;
const slotOf = (i) => slides[i].querySelector(".phone-slot");

let index = Math.min(Math.max((parseInt(location.hash.slice(1), 10) || 1) - 1, 0), slides.length - 1);
let tl = null;
const say = createDeemo(document.getElementById("deemo"));

function updateChrome() {
  const { deemo, say: line } = slides[index].dataset;
  say(deemo, line);
  count.textContent = `${pad(index + 1)} / ${pad(slides.length)}`;
  gsap.to(progress, { scaleX: index / (slides.length - 1), duration: 0.6, ease: "power3.out" });
  history.replaceState(null, "", `#${index + 1}`);
  syncFlow();
}

// ── slide 10: the active step drives the phone screen, cycling on its own until clicked ──
let step = 0;
let flowTimer = null;
function setStep(n) {
  step = n;
  flowButtons.forEach((b, i) => b.parentElement.classList.toggle("is-on", i === n));
  if (index === flowSlide) phone?.setScreen(flowButtons[n].dataset.screen);
}
function syncFlow() {
  clearInterval(flowTimer);
  if (index !== flowSlide) return;
  setStep(0);
  flowTimer = setInterval(() => setStep((step + 1) % flowButtons.length), 3200);
}
flowButtons.forEach((b, i) =>
  b.addEventListener("click", () => {
    clearInterval(flowTimer);
    setStep(i);
  }),
);
setStep(0);

const reveal = (s) => s.querySelectorAll(".r");

function go(next) {
  if (next < 0 || next >= slides.length || next === index) return;
  tl?.progress(1); // finish an in-flight transition instead of stacking a second one
  const out = slides[index];
  const inn = slides[next];
  const dir = Math.sign(next - index);
  index = next;
  inn.classList.add("is-active");
  phone?.goTo(slotOf(index));
  updateChrome();

  const outR = reveal(out);
  tl = gsap.timeline({
    onComplete() {
      out.classList.remove("is-active");
      gsap.set(outR, { clearProps: "all" });
    },
  });
  if (reduced.matches) {
    tl.to(outR, { autoAlpha: 0, duration: 0.2 }, 0).fromTo(reveal(inn), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, 0.15);
    return;
  }
  tl.to(outR, { autoAlpha: 0, y: -28 * dir, filter: "blur(6px)", duration: 0.34, ease: "power2.in", stagger: 0.012 }, 0)
    .fromTo(
      reveal(inn),
      { autoAlpha: 0, y: 46 * dir, filter: "blur(8px)" },
      { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 0.8, ease: "expo.out", stagger: 0.045, clearProps: "filter" },
      0.3,
    );
}

// ── input: clickers send arrows/PageUp/PageDown ──
addEventListener("keydown", (e) => {
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  const onButton = e.target.closest?.("button");
  switch (e.key) {
    case "ArrowRight": case "ArrowDown": case "PageDown": go(index + 1); break;
    case " ": case "Enter": if (onButton) return; go(index + 1); break;
    case "ArrowLeft": case "ArrowUp": case "PageUp": case "Backspace": go(index - 1); break;
    case "Home": go(0); break;
    case "End": go(slides.length - 1); break;
    case "f": case "F":
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen?.();
      break;
    default: return;
  }
  e.preventDefault();
});
document.getElementById("prevBtn").addEventListener("click", () => go(index - 1));
document.getElementById("nextBtn").addEventListener("click", () => go(index + 1));

let touchX = null;
addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") touchX = e.clientX; });
addEventListener("pointerup", (e) => {
  if (touchX === null) return;
  const dx = e.clientX - touchX;
  touchX = null;
  if (Math.abs(dx) > 60) go(index + (dx < 0 ? 1 : -1));
});
addEventListener("hashchange", () => go((parseInt(location.hash.slice(1), 10) || 1) - 1));

// ── first paint ──
slides[index].classList.add("is-active");
updateChrome();
gsap.fromTo(reveal(slides[index]), { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 1, ease: "expo.out", stagger: 0.07, delay: 0.15 });

try {
  phone = await createPhone(document.getElementById("phone"));
  phone.goTo(slotOf(index)); // flies in from out of frame
  if (index === flowSlide) setStep(step);
} catch (err) {
  console.warn("3D phone unavailable:", err);
}
