// The 3D phone, following the visitor's scroll. Model, screens and lighting come from client/web/presentation (see
// model.ts, screens.ts); what's new here is the motion: instead of timed flights between slides, every frame the
// phone is placed between the two .phone-slot elements around the viewport's middle, interpolated by how far the
// visitor has scrolled from one to the next, then eased toward that with a little lag so it reads as physical.
import gsap from "gsap";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

import { buildModel, PH, PW, SCR_H, SH, softShadowTexture } from "./model";
import { createScreens, type ScreenId, type ScreenSet } from "./screens";

const TAU = Math.PI * 2;
const POSES: Record<string, [number, number, number]> = {
  front: [0, 0, 0],
  hero: [-0.08, -0.42, 0.05],
  left: [-0.04, 0.32, 0.02],
  right: [-0.04, -0.32, -0.02],
};
const LAG = 0.14; // share of the remaining distance covered per frame (1 = no lag)

type Target = { x: number; y: number; s: number; rx: number; ry: number; rz: number };

const smooth = (t: number) => t * t * (3 - 2 * t);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const mixT = (a: Target, b: Target, t: number): Target => ({
  x: mix(a.x, b.x, t),
  y: mix(a.y, b.y, t),
  s: mix(a.s, b.s, t),
  rx: mix(a.rx, b.rx, t),
  ry: mix(a.ry, b.ry, t),
  rz: mix(a.rz, b.rz, t),
});

export type Phone = { setVelocity: (v: number) => void };

// Throws when WebGL isn't available; the caller falls back to a static mark.
export async function createPhone(canvas: HTMLCanvasElement, slots: HTMLElement[], reduced: boolean): Promise<Phone> {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  const key = new THREE.DirectionalLight("#fff6ea", 1.4);
  key.position.set(-3, 4, 6);
  scene.add(key);

  const camera = new THREE.PerspectiveCamera(22, 1, 0.1, 100);
  camera.position.z = 12;

  const screens = (await createScreens(THREE)) as ScreenSet;
  // Two stacked screens: the top one fades a new screen in, then hands it to the bottom one.
  const base = new THREE.MeshBasicMaterial({ toneMapped: false });
  const fade = new THREE.MeshBasicMaterial({ toneMapped: false, transparent: true, opacity: 0, depthWrite: false });

  // root: scroll placement · lean: banking with scroll speed · float: idle bob + pointer tilt
  const root = new THREE.Group();
  const lean = new THREE.Group();
  const float = new THREE.Group();
  root.add(lean);
  lean.add(float);
  float.add(buildModel([base, fade]));
  scene.add(root);

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(PW * 1.9, PH * 1.35),
    new THREE.MeshBasicMaterial({ map: softShadowTexture(), transparent: true, opacity: 0, depthWrite: false, toneMapped: false }),
  );
  scene.add(shadow);

  let current: ScreenId = (slots[0]?.dataset.screen as ScreenId) ?? "splash";
  let fadeTween: gsap.core.Tween | null = null;
  base.map = screens.texture(current);

  function setScreen(id: ScreenId) {
    if (id === current) return;
    current = id;
    fadeTween?.progress(1);
    fade.map = screens.texture(id);
    fade.needsUpdate = true;
    fadeTween = gsap.fromTo(
      fade,
      { opacity: 0 },
      {
        opacity: 1,
        duration: reduced ? 0.2 : 0.35,
        ease: "power1.inOut",
        onComplete() {
          base.map = fade.map;
          base.needsUpdate = true;
          fade.opacity = 0;
        },
      },
    );
  }

  // px → world units at z = 0
  const unit = () => (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z) / innerHeight;

  function targetFor(el: HTMLElement): Target {
    const u = unit();
    const r = el.getBoundingClientRect();
    const [rx, ry, rz] = POSES[el.dataset.pose ?? "front"] ?? POSES.front!;
    return {
      x: (r.left + r.width / 2 - innerWidth / 2) * u,
      y: -(r.top + r.height / 2 - innerHeight / 2) * u,
      s: Math.min(r.height, r.width / PW) * u,
      rx,
      ry,
      rz,
    };
  }

  // Out of frame, bottom-right, turned away: where the phone goes after the last chapter.
  function exitFrom(t: Target): Target {
    const u = unit();
    return { x: (innerWidth / 2) * u + t.s * 0.9, y: -(innerHeight / 2) * u - t.s * 0.4, s: t.s, rx: 0.2, ry: -1.1, rz: 0.35 };
  }

  // Where the phone belongs at this scroll position, and which screen it shows.
  function desired(): { t: Target; screen: ScreenId } {
    const mid = innerHeight / 2;
    const centers = slots.map((el) => {
      const r = el.getBoundingClientRect();
      return r.top + r.height / 2;
    });
    if (mid <= centers[0]!) return { t: targetFor(slots[0]!), screen: slots[0]!.dataset.screen as ScreenId };
    for (let i = 0; i < slots.length - 1; i++) {
      const a = centers[i]!;
      const b = centers[i + 1]!;
      if (mid > b) continue;
      const k = smooth(Math.min(1, Math.max(0, (mid - a) / (b - a))));
      const to = slots[i + 1]!;
      const t = mixT(targetFor(slots[i]!), targetFor(to), k);
      if (to.dataset.spin && !reduced) t.ry += TAU * k; // one full turn on the way into this chapter
      return { t, screen: (k < 0.5 ? slots[i]! : to).dataset.screen as ScreenId };
    }
    // Past the last slot: leave over the next ~70% of a viewport.
    const last = slots[slots.length - 1]!;
    const from = targetFor(last);
    const k = smooth(Math.min(1, (mid - centers[centers.length - 1]!) / (innerHeight * 0.7)));
    return { t: mixT(from, exitFrom(from), k), screen: last.dataset.screen as ScreenId };
  }

  // Draw the screen texture at the size it appears on screen (device pixels), so text stays sharp.
  let sharpS = 0;
  function sharpen(s: number) {
    if (Math.abs(s - sharpS) < sharpS * 0.15) return;
    sharpS = s;
    const px = (s * SCR_H * renderer.getPixelRatio()) / unit();
    const next = Math.min(4, Math.max(0.75, Math.floor((px / SH) * 4) / 4));
    if (!screens.setScale(next)) return;
    fadeTween?.progress(1);
    base.map = screens.texture(current);
  }

  const cur: Target = desired().t;
  function resize() {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    Object.assign(cur, desired().t);
    sharpS = 0;
  }
  addEventListener("resize", resize);
  resize();

  const pointer = { x: 0, y: 0 };
  addEventListener("pointermove", (e) => {
    pointer.x = e.clientX / innerWidth - 0.5;
    pointer.y = e.clientY / innerHeight - 0.5;
  });

  let velocity = 0;
  let bank = 0;
  const timer = new THREE.Timer();
  let lastTick = 0;
  renderer.setAnimationLoop((now) => {
    if (document.hidden) return;
    timer.update(now);
    const time = timer.getElapsed();

    const d = desired();
    const k = reduced ? 1 : LAG;
    for (const key of ["x", "y", "s", "rx", "ry", "rz"] as const) cur[key] += (d.t[key] - cur[key]) * k;
    setScreen(d.screen);
    sharpen(cur.s);

    root.position.set(cur.x, cur.y, 0);
    root.scale.setScalar(cur.s);
    root.rotation.set(cur.rx, cur.ry, cur.rz);
    if (!reduced) {
      // Bank with scroll speed (Lenis px/frame), settling back when the visitor stops.
      bank += (Math.max(-0.2, Math.min(0.2, -velocity * 0.006)) - bank) * 0.1;
      lean.rotation.set(bank * 0.4, 0, bank);
      float.position.y = Math.sin(time * 1.1) * 0.012;
      float.rotation.x += (pointer.y * 0.16 - float.rotation.x) * 0.06;
      float.rotation.y += (pointer.x * 0.24 - float.rotation.y) * 0.06;
    }
    // Live screens redraw at ~30 fps, only the one showing.
    if (time - lastTick > 1 / 30) {
      screens.tick(current, time);
      lastTick = time;
    }
    // Contact shadow on the page behind it, hidden once the phone has left.
    const s = root.scale.x;
    shadow.position.set(root.position.x + s * 0.06, root.position.y - s * 0.07, -0.8);
    shadow.scale.setScalar(s);
    shadow.rotation.z = root.rotation.z + lean.rotation.z;
    const onScreen = Math.abs(root.position.x) < (innerWidth / 2) * unit() + s * 0.1;
    (shadow.material as THREE.MeshBasicMaterial).opacity = onScreen ? 0.2 : 0;
    renderer.render(scene, camera);
  });

  return {
    setVelocity(v) {
      velocity = v;
    },
  };
}
