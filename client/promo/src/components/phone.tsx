// The 3D device in CSS 3D: a front face (black glass + live screen), an extruded titanium frame (stacked outlines)
// and a dusk back with a camera plateau, so it reads as solid through a turn. A reflection sweeps across the
// glass as it rotates. `overlay` renders above the screen without its clipping, in screen coordinates: things that
// fly in from outside and dock onto the screen.
import type React from "react";

export const PHONE_W = 380;
export const PHONE_H = 790;
export const SCREEN_W = 352;
export const SCREEN_H = 762;
const R = 64;
const DEPTH = 34;
const LAYERS = 12;
const INSET_X = (PHONE_W - SCREEN_W) / 2;
const INSET_Y = (PHONE_H - SCREEN_H) / 2;

export type Pose = { x: number; y: number; z: number; rx: number; ry: number; rz: number; s: number; o: number };

export const Phone: React.FC<{ pose: Pose; children: React.ReactNode; overlay?: React.ReactNode }> = ({ pose, children, overlay }) => {
  const { x, y, z, rx, ry, rz, s, o } = pose;
  const gloss = 50 - ((((ry % 360) + 540) % 360) - 180) * 1.6 - rx * 0.8;
  const slab: React.CSSProperties = { position: "absolute", inset: 0, borderRadius: R };

  return (
    <div style={{ position: "absolute", inset: 0, perspective: 2200, opacity: o }}>
      {/* soft shadow pooled under the phone */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: PHONE_W * 1.3,
          height: 90,
          marginLeft: -PHONE_W * 0.65,
          borderRadius: "50%",
          background: "radial-gradient(closest-side, rgba(42,36,32,0.3), transparent)",
          transform: `translate(${x}px, ${y + PHONE_H * 0.5 * s + 50}px) scale(${s})`,
          filter: "blur(10px)",
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
        }}
      >
        {/* back: dusk, with a camera plateau */}
        <div
          style={{
            ...slab,
            transform: `translateZ(${-DEPTH}px) rotateY(180deg)`,
            backfaceVisibility: "hidden",
            background: "linear-gradient(150deg, #7380D8, #5A66C7 50%, #343996)",
            boxShadow: "inset 0 0 0 4px #A8A3B4",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 30,
              left: 30,
              width: 150,
              height: 150,
              borderRadius: 40,
              background: "linear-gradient(150deg, #6B77D2, #4D57B7)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7), 0 6px 14px rgba(40,20,100,0.25)",
            }}
          >
            {[
              [18, 18],
              [78, 18],
              [48, 78],
            ].map(([l, t], i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: l,
                  top: t,
                  width: 54,
                  height: 54,
                  borderRadius: "50%",
                  background: "radial-gradient(circle at 40% 35%, #4b4f6b, #0a0b14 60%)",
                  boxShadow: "0 0 0 5px #b9b4c6",
                }}
              />
            ))}
          </div>
        </div>
        {/* frame: stacked outlines make the titanium side walls */}
        {Array.from({ length: LAYERS }, (_, i) => (
          <div
            key={i}
            style={{
              ...slab,
              transform: `translateZ(${-((i + 0.5) * DEPTH) / LAYERS}px)`,
              background: ["#BEBAC6", "#8F8A99", "#A7A2B1", "#76717F"][i % 4],
            }}
          />
        ))}
        {/* front */}
        <div style={{ ...slab, background: "#050507", backfaceVisibility: "hidden", boxShadow: "inset 0 0 0 3px #9E99A8, inset 0 0 0 5px #1b1b20" }}>
          <div
            style={{
              position: "absolute",
              left: INSET_X,
              top: INSET_Y,
              width: SCREEN_W,
              height: SCREEN_H,
              borderRadius: R - 14,
              overflow: "hidden",
              background: "#F7F3EC",
            }}
          >
            {children}
          </div>
          {overlay ? <div style={{ position: "absolute", left: INSET_X, top: INSET_Y, width: SCREEN_W, height: SCREEN_H }}>{overlay}</div> : null}
          {/* Dynamic Island */}
          <div style={{ position: "absolute", top: INSET_Y + 14, left: "50%", width: 110, height: 32, marginLeft: -55, borderRadius: 16, background: "#000" }} />
          {/* reflection */}
          <div
            style={{
              position: "absolute",
              left: INSET_X,
              top: INSET_Y,
              width: SCREEN_W,
              height: SCREEN_H,
              borderRadius: R - 14,
              background: `linear-gradient(115deg, transparent ${gloss - 22}%, rgba(255,255,255,0.2) ${gloss}%, transparent ${gloss + 22}%)`,
              pointerEvents: "none",
            }}
          />
        </div>
      </div>
    </div>
  );
};
