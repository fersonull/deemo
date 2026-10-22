// The hero's question slips in three.js: a loose stack of ruled notepaper, the top slip legible. Drag or flick it
// off (or press Next question): it flips to its back, the follow-up the panelist would ask, and lands on the pile
// beside the stack while the next slip comes forward. When the stack runs out, the pile gathers back.
import gsap from "gsap";
import {
  CanvasTexture,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Plane,
  PlaneGeometry,
  Raycaster,
  Scene,
  ShadowMaterial,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
  PCFSoftShadowMap,
} from "three";

import type { Slip } from "../content";
import { drawSlip, fontsReady, SLIP_H, SLIP_W } from "./slip-face";

const W = 5;
const H = (W * SLIP_H) / SLIP_W;

// A slip curls back a little at the long edges, like paper that has been held.
function slipGeometry() {
  const g = new PlaneGeometry(W, H, 40, 1);
  const pos = g.attributes.position!;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) / (W / 2);
    pos.setZ(i, -0.16 * x * x);
  }
  g.computeVertexNormals();
  return g;
}

type Card = { group: Group; slip: Slip; jitter: number };

export type Stack = { next: () => void; destroy: () => void };

export async function mountStack(
  host: HTMLElement,
  slips: Slip[],
  { onShow, reduced }: { onShow: (top: Slip | null, answered: Slip | null) => void; reduced: boolean },
): Promise<Stack> {
  await fontsReady();

  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  renderer.domElement.className = "stack__canvas";
  renderer.domElement.setAttribute("aria-hidden", "true");
  host.prepend(renderer.domElement);

  const scene = new Scene();
  const camera = new PerspectiveCamera(26, 1, 0.1, 100);
  camera.position.set(0, 0.5, 11.5);
  camera.lookAt(0, 0, 0);

  scene.add(new HemisphereLight(0xffffff, 0xf3ece0, 2.9));
  const sun = new DirectionalLight(0xffffff, 1.2);
  sun.position.set(-4, 6, 9);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.radius = 8;
  sun.shadow.bias = -0.0004;
  sun.shadow.intensity = 0.45; // paper on paper: soft, never grey
  Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 6, bottom: -6, near: 1, far: 30 });
  scene.add(sun);

  // The page itself catches the shadows, so the slips sit on the paper rather than float in front of it.
  const floor = new Mesh(new PlaneGeometry(40, 30), new ShadowMaterial({ opacity: 0.12 }));
  floor.position.z = -1.4;
  floor.receiveShadow = true;
  scene.add(floor);

  const root = new Group();
  scene.add(root);

  const geometry = slipGeometry();
  const material = (canvas: HTMLCanvasElement) => {
    const map = new CanvasTexture(canvas);
    map.colorSpace = SRGBColorSpace;
    map.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return new MeshStandardMaterial({ map, roughness: 0.92, metalness: 0 });
  };

  const cards: Card[] = slips.map((slip, i) => {
    const group = new Group();
    const front = new Mesh(geometry, material(drawSlip(slip, "front")));
    const back = new Mesh(geometry, material(drawSlip(slip, "back")));
    back.rotation.y = Math.PI;
    for (const m of [front, back]) {
      m.castShadow = true;
      m.receiveShadow = true;
      group.add(m);
    }
    group.userData.front = front;
    root.add(group);
    return { group, slip, jitter: [0.02, -0.035, 0.03, -0.02, 0.04, -0.03][i % 6]! };
  });

  // Where things sit: the stack to the right, the pile of answered slips down and to the left.
  let stack = [...cards];
  let pile: Card[] = [];
  // On a phone the stack is centered and the pile lands below it, overlapping its foot.
  const box = host.getBoundingClientRect();
  let narrow = box.width / box.height < 1.1;
  const slot = (depth: number) =>
    narrow ? { x: depth * 0.06, y: 0.75 - depth * 0.06, z: -depth * 0.16 } : { x: 0.75 + depth * 0.09, y: 0.4 - depth * 0.08, z: -depth * 0.16 };
  // In front of the stack: the follow-up on the back is the payoff.
  const pileSlot = (n: number) =>
    narrow ? { x: -0.5 - n * 0.04, y: -1.5 + n * 0.03, z: 0.35 + n * 0.012 } : { x: -2.0 - n * 0.04, y: -1.35 + n * 0.03, z: 0.35 + n * 0.012 };

  const place = (instant: boolean) => {
    stack.forEach((c, depth) => {
      const s = slot(depth);
      const to = { ...s, rx: 0, ry: 0, rz: c.jitter, scale: 1 };
      apply(c, to, instant ? 0 : 0.9, (stack.length - depth) * 0.06);
    });
  };
  function apply(c: Card, to: { x: number; y: number; z: number; rx: number; ry: number; rz: number; scale: number }, duration: number, delay = 0) {
    const g = c.group;
    gsap.to(g.position, { x: to.x, y: to.y, z: to.z, duration, delay, ease: "expo.out", overwrite: true });
    gsap.to(g.rotation, { x: to.rx, y: to.ry, z: to.rz, duration, delay, ease: "expo.out", overwrite: true });
    gsap.to(g.scale, { x: to.scale, y: to.scale, z: to.scale, duration, delay, ease: "expo.out", overwrite: true });
  }
  // On arrival the slips are dealt onto the desk, bottom one first.
  if (reduced) place(true);
  else {
    cards.forEach((c, i) => {
      c.group.position.set(3.5, -5 - i * 0.4, 1.5);
      c.group.rotation.set(0, 0, -0.4 + i * 0.05);
    });
    place(false);
  }

  let busy = false;
  const next = () => {
    if (busy) return;
    const top = stack.shift();
    if (!top) return;
    busy = true;
    const n = pile.length;
    pile.push(top);
    const p = pileSlot(n);
    const d = reduced ? 0 : 0.95;
    // A low arc over to the pile, turning over on the way.
    const g = top.group;
    gsap.to(g.position, { x: p.x, z: p.z + 0.6, duration: d * 0.5, ease: "power2.out", overwrite: true });
    gsap.to(g.position, { y: p.y, duration: d, ease: "expo.out" });
    gsap.to(g.position, { z: p.z, duration: d * 0.5, delay: d * 0.5, ease: "power2.in" });
    gsap.to(g.rotation, { x: 0, y: Math.PI, z: -0.07 + n * 0.025, duration: d, ease: "expo.out", overwrite: true });
    gsap.to(g.scale, { x: 0.74, y: 0.74, z: 0.74, duration: d, ease: "expo.out", overwrite: true });
    place(reduced);
    onShow(stack[0]?.slip ?? null, top.slip);
    gsap.delayedCall(d * 0.6, () => {
      busy = false;
      if (!stack.length) gsap.delayedCall(reduced ? 0 : 1.6, gather);
    });
  };

  // Everything answered: the pile flips back face up and returns to the stack, top question first.
  function gather() {
    stack = [...pile];
    pile = [];
    place(reduced);
    onShow(stack[0]!.slip, null);
  }

  // ── dragging the top slip ──
  const ray = new Raycaster();
  const ndc = new Vector2();
  const dragPlane = new Plane(new Vector3(0, 0, 1), 0);
  const hit = new Vector3();
  let drag: { start: Vector3; base: Vector3; last: { x: number; t: number }; vx: number } | null = null;

  const toNdc = (e: PointerEvent) => {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
  };
  const overTop = () => {
    const top = stack[0];
    return !!top && ray.intersectObject(top.group.userData.front as Mesh, false).length > 0;
  };

  const el = renderer.domElement;
  const onDown = (e: PointerEvent) => {
    toNdc(e);
    if (busy || !overTop()) return;
    const g = stack[0]!.group;
    dragPlane.constant = -g.position.z;
    ray.ray.intersectPlane(dragPlane, hit);
    drag = { start: hit.clone(), base: g.position.clone(), last: { x: e.clientX, t: performance.now() }, vx: 0 };
    gsap.killTweensOf([g.position, g.rotation]);
    el.setPointerCapture(e.pointerId);
    host.classList.add("is-dragging");
  };
  const onMove = (e: PointerEvent) => {
    toNdc(e);
    if (!drag) {
      host.classList.toggle("is-grab", overTop());
      return;
    }
    if (!ray.ray.intersectPlane(dragPlane, hit)) return;
    const g = stack[0]!.group;
    const dx = hit.x - drag.start.x;
    const dy = hit.y - drag.start.y;
    g.position.set(drag.base.x + dx, drag.base.y + dy, drag.base.z + 0.25);
    g.rotation.z = stack[0]!.jitter + dx * 0.06;
    g.rotation.y = dx * 0.08;
    const now = performance.now();
    drag.vx = (e.clientX - drag.last.x) / Math.max(1, now - drag.last.t);
    drag.last = { x: e.clientX, t: now };
  };
  const onUp = () => {
    if (!drag) return;
    const g = stack[0]!.group;
    const moved = g.position.distanceTo(drag.base);
    const flick = Math.abs(drag.vx) > 0.6;
    drag = null;
    host.classList.remove("is-dragging");
    if (moved > 1.4 || flick) next();
    else place(false);
  };
  el.addEventListener("pointerdown", onDown);
  el.addEventListener("pointermove", onMove);
  el.addEventListener("pointerup", onUp);
  el.addEventListener("pointercancel", onUp);

  // The stack leans a touch toward the pointer, so it reads as an object on the desk.
  const lean = reduced
    ? null
    : { x: gsap.quickTo(root.rotation, "y", { duration: 0.9, ease: "power3.out" }), y: gsap.quickTo(root.rotation, "x", { duration: 0.9, ease: "power3.out" }) };
  const onLean = (e: PointerEvent) => {
    if (!lean || drag) return;
    const r = host.getBoundingClientRect();
    lean.x(((e.clientX - r.left) / r.width - 0.5) * 0.18);
    lean.y(((e.clientY - r.top) / r.height - 0.5) * 0.12);
  };
  window.addEventListener("pointermove", onLean, { passive: true });

  // ── size and render only while on screen ──
  const resize = () => {
    const { width, height } = host.getBoundingClientRect();
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    const wasNarrow = narrow;
    narrow = width / height < 1.1;
    camera.position.z = narrow ? 13.6 : 11.5;
    camera.updateProjectionMatrix();
    if (narrow !== wasNarrow) {
      place(true);
      pile.forEach((c, n) => c.group.position.set(pileSlot(n).x, pileSlot(n).y, pileSlot(n).z));
    }
  };
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();

  const draw = () => renderer.render(scene, camera);
  const io = new IntersectionObserver(([entry]) => renderer.setAnimationLoop(entry?.isIntersecting ? draw : null));
  io.observe(host);

  host.classList.add("is-3d");
  onShow(stack[0]!.slip, null);

  return {
    next,
    destroy() {
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("pointermove", onLean);
      renderer.setAnimationLoop(null);
      renderer.dispose();
    },
  };
}
