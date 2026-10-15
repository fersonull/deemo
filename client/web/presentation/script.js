(() => {
  const slides = Array.from(document.querySelectorAll(".slide"));
  const dotsEl = document.getElementById("dots");
  const countEl = document.getElementById("count");
  const total = slides.length;

  slides.forEach((slide, i) => {
    const dot = document.createElement("button");
    dot.className = "dot";
    dot.type = "button";
    dot.setAttribute("role", "tab");
    dot.setAttribute("aria-label", `Go to slide ${i + 1}`);
    dot.addEventListener("click", () => goTo(i));
    dotsEl.appendChild(dot);
  });
  const dots = Array.from(dotsEl.children);

  let current = 0;

  function fromHash() {
    const n = parseInt(location.hash.replace("#", ""), 10);
    return Number.isInteger(n) && n >= 1 && n <= total ? n - 1 : 0;
  }

  function render(index, { replay = true } = {}) {
    slides.forEach((slide, i) => {
      if (i === index) {
        if (replay) {
          slide.classList.remove("active");
          // eslint-disable-next-line no-unused-expressions
          void slide.offsetWidth; // force reflow so the entrance animation replays
        }
        slide.classList.add("active");
      } else {
        slide.classList.remove("active");
      }
    });
    dots.forEach((dot, i) => dot.classList.toggle("active", i === index));
    countEl.textContent = `${index + 1} / ${total}`;
  }

  function goTo(index) {
    current = Math.max(0, Math.min(total - 1, index));
    location.hash = String(current + 1);
    render(current);
  }

  function next() { goTo(current + 1); }
  function prev() { goTo(current - 1); }

  document.getElementById("nextBtn").addEventListener("click", next);
  document.getElementById("prevBtn").addEventListener("click", prev);
  document.getElementById("edgeLeft").addEventListener("click", prev);
  document.getElementById("edgeRight").addEventListener("click", next);

  window.addEventListener("keydown", (e) => {
    if (["ArrowRight", " ", "PageDown"].includes(e.key)) { e.preventDefault(); next(); }
    else if (["ArrowLeft", "PageUp"].includes(e.key)) { e.preventDefault(); prev(); }
    else if (e.key === "Home") { e.preventDefault(); goTo(0); }
    else if (e.key === "End") { e.preventDefault(); goTo(total - 1); }
  });

  let touchStartX = null;
  window.addEventListener("touchstart", (e) => { touchStartX = e.changedTouches[0].clientX; }, { passive: true });
  window.addEventListener("touchend", (e) => {
    if (touchStartX === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) dx < 0 ? next() : prev();
    touchStartX = null;
  }, { passive: true });

  window.addEventListener("hashchange", () => render(fromHash(), { replay: false }));

  current = fromHash();
  render(current);
})();
