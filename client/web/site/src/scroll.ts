// Smooth scrolling (Lenis) and one scroll feed for everything that reacts to it: the navbar and the phone.
// Off for reduced motion and on touch screens (native momentum feels right there); the feed still works natively.
import gsap from "gsap";
import Lenis from "lenis";

export type ScrollInfo = { y: number; velocity: number; direction: 1 | -1 | 0 };
type Listener = (s: ScrollInfo) => void;

export function initScroll(reduced: boolean) {
  const listeners: Listener[] = [];
  const emit = (s: ScrollInfo) => listeners.forEach((l) => l(s));
  const smooth = !reduced && !matchMedia("(pointer: coarse)").matches;
  let lenis: Lenis | null = null;

  if (smooth) {
    lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 0.9 });
    lenis.on("scroll", (l: Lenis) => emit({ y: l.scroll, velocity: l.velocity, direction: l.direction as 1 | -1 | 0 }));
    gsap.ticker.add((t) => lenis!.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  } else {
    let last = scrollY;
    addEventListener(
      "scroll",
      () => {
        const y = scrollY;
        const v = y - last;
        last = y;
        emit({ y, velocity: v, direction: v > 0 ? 1 : v < 0 ? -1 : 0 });
      },
      { passive: true },
    );
  }

  // In-page links (#id) scroll through Lenis when it's on.
  const scrollTo = (target: string | HTMLElement) => {
    const el = typeof target === "string" ? document.querySelector<HTMLElement>(target) : target;
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { offset: -24 });
    else el.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
  };
  document.addEventListener("click", (e) => {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
    if (!a || a.getAttribute("href") === "#") return;
    e.preventDefault();
    scrollTo(a.getAttribute("href")!);
  });

  return { onScroll: (l: Listener) => listeners.push(l), scrollTo };
}

// Hide the navbar while scrolling down, bring it back on any scroll up or near the top. A small dead zone keeps
// trackpad jitter from flickering it; keyboard focus inside it always shows it (base.css :focus-within).
export function initSmartNav(nav: HTMLElement, onScroll: (l: Listener) => void) {
  let last = 0;
  let run = 0; // distance scrolled in the current direction
  onScroll(({ y }) => {
    const d = y - last;
    last = y;
    if (y < 80) {
      run = 0;
      nav.classList.remove("nav--hidden");
      return;
    }
    if (Math.sign(d) !== Math.sign(run)) run = 0;
    run += d;
    if (run > 6) nav.classList.add("nav--hidden");
    else if (run < -6) nav.classList.remove("nav--hidden");
  });
}
