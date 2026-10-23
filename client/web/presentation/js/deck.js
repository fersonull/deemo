// Slide navigation, GSAP slide transitions, and the phone hand-off between slides.
import { createDeemo } from "./deemo.js";
import { createPhone } from "./phone.js";

const stage = document.getElementById("stage");
const slides = [...document.querySelectorAll(".slide")];
const count = document.getElementById("count");
const progress = document.getElementById("progress");
const walkthroughs = ["flowSteps", "functionSteps"].map((id) => {
  const buttons = [...document.querySelectorAll(`#${id} button`)];
  return { id, buttons, slide: slides.findIndex((s) => s.contains(buttons[0])), step: 0 };
});
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
  syncWalkthrough();
}

// Both walkthroughs drive the shared phone; only the session steps cycle automatically.
let flowTimer = null;
const activeWalkthrough = () => walkthroughs.find((w) => w.slide === index);
function setStep(w, n) {
  w.step = n;
  w.buttons.forEach((b, i) => {
    b.parentElement.classList.toggle("is-on", i === n);
    b.setAttribute("aria-pressed", String(i === n));
  });
  const screen = w.buttons[n].dataset.screen;
  slotOf(w.slide).dataset.screen = screen;
  if (index === w.slide) phone?.setScreen(screen);
}
function syncWalkthrough() {
  clearInterval(flowTimer);
  const w = activeWalkthrough();
  if (!w) return;
  setStep(w, 0);
  if (w.id === "flowSteps" && !reduced.matches) {
    flowTimer = setInterval(() => setStep(w, (w.step + 1) % w.buttons.length), 3200);
  }
}
walkthroughs.forEach((w) => {
  w.buttons.forEach((b, i) => b.addEventListener("click", () => {
    clearInterval(flowTimer);
    setStep(w, i);
  }));
  setStep(w, 0);
});
// Mouse wheel walks the steps (down = next); one step per gesture, so trackpads don't skip ahead.
let wheelAt = 0;
addEventListener("wheel", (e) => {
  const w = activeWalkthrough();
  if (!w || !e.deltaY || e.timeStamp - wheelAt < 400) return;
  wheelAt = e.timeStamp;
  clearInterval(flowTimer);
  setStep(w, Math.min(Math.max(w.step + Math.sign(e.deltaY), 0), w.buttons.length - 1));
}, { passive: true });

const reveal = (s) => s.querySelectorAll(".r");

function go(next) {
  if (next < 0 || next >= slides.length || next === index) return;
  tl?.progress(1); // finish an in-flight transition instead of stacking a second one
  const out = slides[index];
  const inn = slides[next];
  const dir = Math.sign(next - index);
  out.querySelector("video")?.pause(); // the promo stops when its slide is left
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

// Mouse: right click = next, left click = previous (buttons, links and the promo video keep their own clicks).
// Touch taps are ignored here; touch moves by swipe.
let pointer = "mouse";
addEventListener("pointerdown", (e) => { pointer = e.pointerType; });
addEventListener("click", (e) => {
  if (e.button === 0 && pointer === "mouse" && !e.target.closest("button, a, video")) go(index - 1);
});
addEventListener("contextmenu", (e) => {
  e.preventDefault();
  go(index + 1);
});

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
  const w = activeWalkthrough();
  if (w) setStep(w, w.step);
} catch (err) {
  console.warn("3D phone unavailable:", err);
}
