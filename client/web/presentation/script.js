(() => {
  const slides = Array.from(document.querySelectorAll(".slide"));
  const dotsEl = document.getElementById("dots");
  const countEl = document.getElementById("count");
  const total = slides.length;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

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

  let current = -1; // -1 = not yet shown
  let transitionToken = 0; // guards stale cleanup from superseded/overlapping transitions

  function fromHash() {
    const n = parseInt(location.hash.replace("#", ""), 10);
    return Number.isInteger(n) && n >= 1 && n <= total ? n - 1 : 0;
  }

  // clears the in-flight-transition bookkeeping only — never touches "active",
  // which is handled synchronously and authoritatively in pushTo/fadeTo instead
  function settle(slide) {
    slide.classList.remove("transiting");
    slide.style.transition = "";
    slide.style.transform = "";
  }

  // both slides move together, same duration: the outgoing slide is pushed
  // off in the direction of travel while the incoming slide arrives from
  // the opposite edge — one connected motion, not two independent fades.
  function pushTo(index, direction) {
    const outgoing = current >= 0 ? slides[current] : null;
    const incoming = slides[index];

    // "active" (which slide is current, for dots/counter/a11y) is reassigned
    // synchronously every call, so rapid/overlapping navigation can never
    // leave two slides active or zero slides active. Visibility during the
    // animation itself is handled separately by .transiting (see CSS), so
    // removing "active" from the outgoing slide here does not cut its exit
    // animation short.
    //
    // Also force-settle every slide except incoming: a transition superseded
    // by a faster follow-up click never gets to run its own cleanup (see the
    // token guard below), so without this sweep its leftover .transiting
    // class would keep rendering it on top of the real current slide.
    slides.forEach((s) => {
      s.classList.remove("active");
      if (s !== incoming) settle(s);
    });
    incoming.classList.add("active");

    incoming.classList.add("transiting");
    incoming.style.transition = "none";
    incoming.style.transform = `translateX(${direction * 100}%)`;
    void incoming.offsetWidth; // flush the un-transitioned starting position
    incoming.style.transition = "";

    if (outgoing) outgoing.classList.add("transiting");

    // double rAF: the first frame must actually paint the off-screen starting
    // position, or the browser collapses both writes and skips the transition
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        incoming.style.transform = "translateX(0)";
        if (outgoing) outgoing.style.transform = `translateX(${-direction * 100}%)`;
      });
    });

    // this transition "owns" visual cleanup until a newer one supersedes it;
    // a superseded transition's cleanup becomes a no-op rather than cutting
    // short an element a later transition has since taken over
    const token = ++transitionToken;
    let cleaned = false;
    const finish = () => {
      if (cleaned || token !== transitionToken) return;
      cleaned = true;
      settle(incoming);
      if (outgoing) settle(outgoing);
    };
    // transitionend is the normal path; the timeout is a safety net so a
    // missed event (backgrounded tab, interrupted frame) can never leave a
    // slide stuck mid-transition during a live presentation
    setTimeout(finish, 650);
    incoming.addEventListener("transitionend", function onEnd(e) {
      if (e.propertyName !== "transform") return;
      incoming.removeEventListener("transitionend", onEnd);
      finish();
    }, { once: true });
  }

  function fadeTo(index) {
    slides.forEach((s) => { s.classList.remove("active"); settle(s); });
    slides[index].classList.add("active");
  }

  function performTransition(index) {
    const direction = current < 0 ? 0 : index > current ? 1 : -1;
    if (current < 0 || reducedMotion.matches) fadeTo(index);
    else pushTo(index, direction);

    current = index;
    dots.forEach((dot, i) => dot.classList.toggle("active", i === index));
    countEl.textContent = `${index + 1} / ${total}`;
  }

  function goTo(index) {
    const clamped = Math.max(0, Math.min(total - 1, index));
    if (clamped === current) return;
    location.hash = String(clamped + 1);
    performTransition(clamped);
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

  window.addEventListener("hashchange", () => {
    const n = fromHash();
    if (n !== current) performTransition(n);
  });

  performTransition(fromHash());
})();
