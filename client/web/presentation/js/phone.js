// One 3D phone on a full-viewport WebGL canvas above the stage. goTo(slot) flies it to the
// rect of a .phone-slot on the incoming slide; the slot's data-screen/data-pose/data-spin say
// what it shows and how it sits. No slot → it leaves the frame bottom-right.
import * as THREE from "../vendor/three.js";
import { createScreens, W as SW, H as SH } from "./screens.js";

const TAU = Math.PI * 2;

// Model units: the phone is 1 tall. Proportions follow the prototype frame (378×778 outer, 360×760 screen).
const PH = 1;
const PW = 378 / 778;
const PD = 0.06;
const SCR_H = SH / 778;
const SCR_W = SW / 778;

const POSES = {
  front: { x: 0, y: 0, z: 0 },
  hero: { x: -0.08, y: -0.42, z: 0.05 },
  left: { x: -0.04, y: -0.3, z: 0.02 },
  right: { x: -0.04, y: 0.3, z: -0.02 },
};

function roundedRect(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

// ShapeGeometry UVs are raw coordinates; remap to 0..1 over the shape's bounds.
function flatPanel(w, h, r) {
  const g = new THREE.ShapeGeometry(roundedRect(w, h, r), 24);
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / w + 0.5, pos.getY(i) / h + 0.5);
  return g;
}

function softShadowTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 512;
  const ctx = c.getContext("2d");
  ctx.filter = "blur(26px)";
  ctx.fillStyle = "rgba(42,36,32,1)";
  ctx.beginPath();
  ctx.roundRect(64, 64, 128, 384, 36);
  ctx.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function wordmarkTexture() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 160;
  const ctx = c.getContext("2d");
  ctx.font = '800 112px "Bricolage Grotesque"';
  ctx.letterSpacing = "-4px";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#F7F3EC";
  ctx.fillText("deemo", 256, 84);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function buildModel(screenMats) {
  const model = new THREE.Group();

  // Body: dusk glass back (extrude caps) + ink metal frame (extrude sides).
  const bevel = 0.012;
  const body = new THREE.ExtrudeGeometry(roundedRect(PW - bevel * 2, PH - bevel * 2, 0.064 - bevel), {
    depth: PD - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 6,
    curveSegments: 28,
  });
  body.center();
  const back = new THREE.MeshPhysicalMaterial({ color: "#4D57B7", roughness: 0.42, metalness: 0.1, clearcoat: 0.8, clearcoatRoughness: 0.25 });
  const frame = new THREE.MeshPhysicalMaterial({ color: "#3E3731", roughness: 0.28, metalness: 0.85, clearcoat: 1, clearcoatRoughness: 0.1 });
  model.add(new THREE.Mesh(body, [back, frame]));

  const front = PD / 2;
  const bezel = new THREE.Mesh(
    flatPanel(PW - 0.012, PH - 0.012, 0.058),
    new THREE.MeshPhysicalMaterial({ color: "#0b0a09", roughness: 0.18, clearcoat: 1 }),
  );
  bezel.position.z = front + 0.0004;
  model.add(bezel);

  const screenGeo = flatPanel(SCR_W, SCR_H, 42 / 778);
  screenMats.forEach((m, i) => {
    const s = new THREE.Mesh(screenGeo, m);
    s.position.z = front + 0.0008 + i * 0.0004;
    s.renderOrder = 1 + i;
    model.add(s);
  });

  // Glass: additive reflections of the room on top of the screen.
  const glass = new THREE.Mesh(
    flatPanel(PW - 0.012, PH - 0.012, 0.058),
    new THREE.MeshStandardMaterial({ color: "#ffffff", metalness: 1, roughness: 0.12, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  glass.position.z = front + 0.002;
  glass.renderOrder = 4;
  model.add(glass);

  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.011, 32), new THREE.MeshBasicMaterial({ color: "#050505" }));
  hole.position.set(0, SCR_H / 2 - 0.021, front + 0.0022);
  hole.renderOrder = 5;
  model.add(hole);

  // Side keys.
  const keyMat = frame;
  for (const [y, h] of [[0.2, 0.1], [0.04, 0.06]]) {
    const k = new THREE.Mesh(new THREE.BoxGeometry(0.008, h, 0.016), keyMat);
    k.position.set(PW / 2 + 0.002, y, 0);
    model.add(k);
  }

  // Back: camera island + wordmark.
  const backZ = -PD / 2;
  const island = new THREE.Mesh(
    new THREE.ExtrudeGeometry(roundedRect(0.17, 0.17, 0.045), { depth: 0.006, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 3 }),
    new THREE.MeshPhysicalMaterial({ color: "#434EAE", roughness: 0.3, clearcoat: 1 }),
  );
  island.rotation.y = Math.PI;
  island.position.set(PW / 2 - 0.13, PH / 2 - 0.13, backZ);
  model.add(island);
  const lensMat = new THREE.MeshPhysicalMaterial({ color: "#0b0a09", roughness: 0.05, metalness: 0.2, clearcoat: 1 });
  const ringMat = new THREE.MeshPhysicalMaterial({ color: "#2A2420", roughness: 0.25, metalness: 0.9 });
  for (const [dx, dy] of [[-0.035, 0.035], [0.035, -0.035], [-0.035, -0.035]]) {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.012, 40), ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(PW / 2 - 0.13 + dx, PH / 2 - 0.13 + dy, backZ - 0.012);
    model.add(ring);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.02, 40), lensMat);
    lens.rotation.y = Math.PI;
    lens.position.copy(ring.position).setZ(backZ - 0.0185);
    model.add(lens);
  }
  const mark = new THREE.Mesh(
    new THREE.PlaneGeometry(0.2, 0.0625),
    new THREE.MeshBasicMaterial({ map: wordmarkTexture(), transparent: true, opacity: 0.85, toneMapped: false }),
  );
  mark.rotation.y = Math.PI;
  mark.position.set(0, -0.08, backZ - 0.0005);
  model.add(mark);

  return model;
}

export async function createPhone(canvas) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new THREE.RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  const key = new THREE.DirectionalLight("#fff6ea", 1.4);
  key.position.set(-3, 4, 6);
  scene.add(key);

  const camera = new THREE.PerspectiveCamera(22, 1, 0.1, 100);
  camera.position.z = 12;

  const screens = await createScreens(THREE);
  // Two stacked screens: the top one fades in a new screen, then hands it to the bottom one.
  const base = new THREE.MeshBasicMaterial({ toneMapped: false });
  const fade = new THREE.MeshBasicMaterial({ toneMapped: false, transparent: true, opacity: 0, depthWrite: false });

  // root: GSAP flight (position/rotation/scale) · lean: banking in flight · float: idle bob + pointer tilt
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

  let current = "splash";
  let slot = null;
  let flight = null;
  let fadeTween = null;
  base.map = screens.texture(current);

  function setScreen(id, delay = 0) {
    if (id === current) return;
    current = id;
    fadeTween?.progress(1);
    fade.map = screens.texture(id);
    fade.needsUpdate = true;
    fadeTween = gsap.fromTo(fade, { opacity: 0 }, {
      opacity: 1,
      duration: reduced.matches ? 0.25 : 0.35,
      delay,
      ease: "power1.inOut",
      onComplete() {
        base.map = fade.map;
        base.needsUpdate = true;
        fade.opacity = 0;
      },
    });
  }

  // px → world at z=0
  const unit = () => (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z) / innerHeight;

  function targetFor(el) {
    const u = unit();
    if (!el) {
      // Out of frame, bottom-right, turned away.
      const s = root.scale.x || 300 * u;
      return { x: (innerWidth / 2) * u + s * 0.9, y: -(innerHeight / 2) * u - s * 0.2, s, rot: { x: 0.2, y: -1.1, z: 0.35 } };
    }
    const r = el.getBoundingClientRect();
    return {
      x: (r.left + r.width / 2 - innerWidth / 2) * u,
      y: -(r.top + r.height / 2 - innerHeight / 2) * u,
      s: Math.min(r.height, r.width / PW) * u,
      rot: POSES[el.dataset.pose] || POSES.front,
    };
  }

  function place(t) {
    root.position.set(t.x, t.y, 0);
    root.scale.setScalar(t.s);
    root.rotation.set(t.rot.x, t.rot.y, t.rot.z);
    lean.rotation.set(0, 0, 0);
  }

  // Draw the screen texture at the size it will appear on screen (device pixels), so it stays sharp.
  function sharpen(t) {
    const px = (t.s * SCR_H * renderer.getPixelRatio()) / unit();
    const next = Math.min(4, Math.max(0.75, Math.floor((px / SH) * 4) / 4));
    if (!screens.setScale(next)) return;
    fadeTween?.progress(1);
    base.map = screens.texture(current);
  }

  function goTo(el, { instant = false } = {}) {
    slot = el;
    const t = targetFor(el);
    if (el) sharpen(t);
    if (el?.dataset.screen) setScreen(el.dataset.screen, instant || reduced.matches ? 0 : 0.35);
    flight?.kill();
    if (instant || reduced.matches) {
      place(t);
      return;
    }
    const dx = t.x - root.position.x;
    const spin = el?.dataset.spin ? TAU * (dx >= 0 ? 1 : -1) : 0;
    // Unwind any earlier spin so the shortest way home is taken.
    root.rotation.y = Math.atan2(Math.sin(root.rotation.y), Math.cos(root.rotation.y));
    const lift = Math.min(1.6, 0.6 + Math.hypot(dx, t.y - root.position.y) * 0.25);
    const dur = spin ? 1.35 : 1.1;
    flight = gsap.timeline({ defaults: { duration: dur, ease: "power3.inOut" } })
      .to(root.position, { x: t.x, y: t.y }, 0)
      .to(root.scale, { x: t.s, y: t.s, z: t.s }, 0)
      .to(root.rotation, { x: t.rot.x, y: t.rot.y + spin, z: t.rot.z }, 0)
      .to(root.position, { z: lift, duration: dur / 2, ease: "power2.out" }, 0)
      .to(root.position, { z: 0, duration: dur / 2, ease: "power2.in" }, dur / 2)
      .to(lean.rotation, { z: -Math.sign(dx) * 0.14, x: 0.06, duration: dur / 2, ease: "power2.out" }, 0)
      .to(lean.rotation, { z: 0, x: 0, duration: dur / 2, ease: "power2.inOut" }, dur / 2);
  }

  function resize() {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    flight?.progress(1);
    const t = targetFor(slot);
    place(t);
    if (slot) sharpen(t);
  }
  addEventListener("resize", resize);
  resize();

  const pointer = { x: 0, y: 0 };
  addEventListener("pointermove", (e) => {
    pointer.x = e.clientX / innerWidth - 0.5;
    pointer.y = e.clientY / innerHeight - 0.5;
  });

  const timer = new THREE.Timer();
  let lastTick = 0;
  renderer.setAnimationLoop((now) => {
    if (document.hidden) return;
    timer.update(now);
    const t = timer.getElapsed();
    if (!reduced.matches) {
      float.position.y = Math.sin(t * 1.1) * 0.012;
      float.rotation.x += (pointer.y * 0.16 - float.rotation.x) * 0.06;
      float.rotation.y += (pointer.x * 0.24 - float.rotation.y) * 0.06;
    }
    // Live screens redraw at ~30 fps, only the one showing.
    if (t - lastTick > 1 / 30) {
      screens.tick(current, t);
      lastTick = t;
    }
    // Contact shadow on the page behind: softer and lighter as the phone lifts.
    const s = root.scale.x;
    const z = root.position.z;
    shadow.position.set(root.position.x + s * 0.06, root.position.y - s * 0.07, -0.8);
    shadow.scale.setScalar(s * (1 + z * 0.35));
    shadow.rotation.z = root.rotation.z + lean.rotation.z;
    const onScreen = Math.abs(root.position.x) < (innerWidth / 2) * unit() + s * 0.3;
    shadow.material.opacity = onScreen ? 0.22 / (1 + z * 1.4) : 0;
    renderer.render(scene, camera);
  });

  return { goTo, setScreen };
}
