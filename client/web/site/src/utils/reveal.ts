// Scroll reveal: every element with [data-reveal] gets .is-visible once it enters the viewport (base.css does the
// actual fade/rise via transition, so this stays a plain class toggle — no per-element GSAP tween needed). Call once
// after the page's sections are all in the DOM.
export function initReveal() {
  const els = document.querySelectorAll<HTMLElement>("[data-reveal]");
  if (!els.length) return;
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const el = e.target as HTMLElement;
        const delay = Number(el.dataset.revealDelay ?? 0);
        setTimeout(() => el.classList.add("is-visible"), delay);
        io.unobserve(el);
      }
    },
    { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
  );
  els.forEach((el) => io.observe(el));
}

// Staggers data-reveal-delay across siblings of a container (40ms apart, capped), so a row of cards rises in a beat
// apart instead of all at once — the app's own `riseIn(i * 40)` rhythm (utils/motion.ts).
export function stagger(container: Element, step = 60, max = 5) {
  Array.from(container.children).forEach((child, i) => {
    (child as HTMLElement).dataset.revealDelay = String(Math.min(i, max) * step);
  });
}
