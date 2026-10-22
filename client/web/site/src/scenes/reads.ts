// "It reads your paper first": pinned while you scroll, each highlighted line of the sample manuscript fills in and
// its slip lifts off that line into the column beside the page. Desktop only; elsewhere the end state shows as is.
import gsap from "gsap";

// An element's position inside `root`, from offsets (unaffected by the transforms the scene animates).
function offsetIn(el: HTMLElement, root: HTMLElement) {
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = el;
  while (node && node !== root) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}

export function readsScene(root: HTMLElement) {
  const slips = [...root.querySelectorAll<HTMLElement>("[data-from]")];

  const tl = gsap.timeline({
    defaults: { ease: "power2.inOut" },
    scrollTrigger: { trigger: root, start: "center center", end: "+=160%", pin: true, scrub: 0.6, invalidateOnRefresh: true },
  });

  slips.forEach((slip, i) => {
    const mark = root.querySelector<HTMLElement>(`[data-mark="${slip.dataset.from}"]`)!;
    const delta = () => {
      const m = offsetIn(mark, root);
      const s = offsetIn(slip, root);
      return { x: m.x + m.w / 2 - (s.x + s.w / 2), y: m.y + m.h / 2 - (s.y + s.h / 2) };
    };
    tl.fromTo(mark, { "--mark": "0%" }, { "--mark": "100%", duration: 0.5 }, i * 1.2)
      .fromTo(
        slip,
        { x: () => delta().x, y: () => delta().y, scale: 0.3, autoAlpha: 0 },
        { x: 0, y: 0, scale: 1, autoAlpha: 1, duration: 0.8, ease: "expo.out" },
        i * 1.2 + 0.35,
      );
  });
  return tl;
}
