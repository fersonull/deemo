// @ts-nocheck — the phone's geometry and materials, ported verbatim from client/web/presentation/js/phone.js
// (buildModel and its helpers). Keep the two in step. The scroll-following behaviour lives in phone.ts.
import * as THREE from "three";

import { H as SH, W as SW } from "./screens";

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

export { buildModel, softShadowTexture, PW, PH, SCR_H, SH };
