// Which chapter is in the middle of the viewport: its number turns dusk and its rail numeral fills. A state change
// on the chapter you're reading, not an entrance animation. The rail hides outside the six chapters.
export function initChapters() {
  const chapters = Array.from(document.querySelectorAll<HTMLElement>("[data-chapter]"));
  const rail = document.querySelector<HTMLElement>(".rail");
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>("[data-rail]"));
  if (!rail || !chapters.length) return;

  const inView = new Set<string>();
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const id = (e.target as HTMLElement).dataset.chapter!;
        if (e.isIntersecting) inView.add(id);
        else inView.delete(id);
      }
      const active = [...inView].sort().pop() ?? null;
      chapters.forEach((c) => c.classList.toggle("is-active", c.dataset.chapter === active));
      links.forEach((l) => l.classList.toggle("is-active", l.dataset.rail === active));
      rail.toggleAttribute("data-off", active === null);
    },
    { rootMargin: "-45% 0px -45% 0px" },
  );
  chapters.forEach((c) => io.observe(c));
}
