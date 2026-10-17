// The 3D device, in CSS 3D: a front face (bezel + live screen), an extruded frame (stacked outlines) and a dusk back
// with the wordmark, so it reads as solid through a full spin. A specular sweep follows its Y rotation.
import type React from "react";
import { C, F } from "./ui";

export const PHONE_W = 380;
export const PHONE_H = 784;
export const SCREEN_W = 356;
export const SCREEN_H = 760;
const R = 62;
const DEPTH = 30;
const LAYERS = 10;

export type Pose = { x: number; y: number; z: number; rx: number; ry: number; rz: number; s: number; o: number };

export const Phone: React.FC<{ pose: Pose; children: React.ReactNode }> = ({ pose, children }) => {
  const { x, y, z, rx, ry, rz, s, o } = pose;
  // light from the upper left: the gloss slides across as the phone turns
  const gloss = 50 - ((((ry % 360) + 540) % 360) - 180) * 1.4;
  const slab: React.CSSProperties = { position: "absolute", inset: 0, borderRadius: R };

  return (
    <>
      {/* contact shadow on the "floor" */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: PHONE_W * 1.1,
          height: 70,
          borderRadius: "50%",
          background: "radial-gradient(closest-side, rgba(42,36,32,0.28), transparent)",
          translate: `${x - PHONE_W * 0.55}px ${y + PHONE_H * 0.5 * s + 40}px`,
          scale: String(s * (1 - Math.min(0.5, Math.abs(z) / 2000))),
          opacity: o * 0.9,
          filter: "blur(6px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: PHONE_W,
          height: PHONE_H,
          marginLeft: -PHONE_W / 2,
          marginTop: -PHONE_H / 2,
          transformStyle: "preserve-3d",
          transform: `translate3d(${x}px, ${y}px, ${z}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg) scale(${s})`,
          opacity: o,
        }}
      >
        {/* back */}
        <div
          style={{
            ...slab,
            transform: `translateZ(${-DEPTH}px) rotateY(180deg)`,
            backfaceVisibility: "hidden",
            background: `linear-gradient(150deg, #6B76D6, ${C.dusk} 45%, ${C.duskInk})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ position: "absolute", top: 34, left: 34, width: 120, height: 120, borderRadius: 34, background: "rgba(42,36,32,0.35)" }} />
          <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 64, color: C.paper, letterSpacing: -1 }}>DEEMO</div>
        </div>
        {/* frame: stacked outlines make the side walls */}
        {Array.from({ length: LAYERS }, (_, i) => (
          <div key={i} style={{ ...slab, transform: `translateZ(${-((i + 0.5) * DEPTH) / LAYERS}px)`, background: i % 3 ? C.inkSoft : "#4a423b" }} />
        ))}
        {/* front */}
        <div style={{ ...slab, background: C.ink, backfaceVisibility: "hidden", boxShadow: "inset 0 0 0 3px #4a423b" }}>
          <div
            style={{
              position: "absolute",
              left: (PHONE_W - SCREEN_W) / 2,
              top: (PHONE_H - SCREEN_H) / 2,
              width: SCREEN_W,
              height: SCREEN_H,
              borderRadius: R - 12,
              overflow: "hidden",
              background: C.paper,
            }}
          >
            {children}
            {/* camera pill */}
            <div style={{ position: "absolute", top: 14, left: "50%", width: 96, height: 26, marginLeft: -48, borderRadius: 13, background: C.ink }} />
            {/* specular sweep */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: `linear-gradient(115deg, transparent ${gloss - 18}%, rgba(255,255,255,0.22) ${gloss}%, transparent ${gloss + 18}%)`,
                pointerEvents: "none",
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
};
