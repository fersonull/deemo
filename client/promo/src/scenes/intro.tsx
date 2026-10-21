// Intro: Deemo pops up over the opening line while the app's blobs and stage chips drift in on depth layers; the
// camera pushes through at the end.
import type React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Deemo } from "../components/deemo";
import { blinkAt } from "../components/panel-face";
import { ios, kf } from "../motion";
import { BLOB, C, F, surface, Words } from "../ui";

// Raised blobs (face + darker lower layer), the app's organic shape.
const BLOBS = [
  { x: 300, y: 230, s: 150, face: C.dusk, depth: C.duskInk, z: 0.7, at: 2 },
  { x: 1630, y: 210, s: 110, face: C.amber, depth: C.amberInk, z: 1, at: 6 },
  { x: 1520, y: 830, s: 180, face: C.duskSoft, depth: C.duskIcon, z: 0.5, at: 10 },
  { x: 380, y: 860, s: 96, face: C.sage, depth: C.sageInk, z: 1.1, at: 14 },
  { x: 1790, y: 560, s: 64, face: C.duskTint, depth: C.dusk, z: 1.3, at: 18 },
];
const CHIPS = [
  { label: "Title Defense", x: 420, y: 400, at: 10 },
  { label: "Pre-Oral", x: 1440, y: 400, at: 15 },
  { label: "Final Defense", x: 1420, y: 790, at: 20 },
];

export const Intro: React.FC<{ len: number }> = ({ len }) => {
  const f = useCurrentFrame();
  const push = kf(f, [len - 40, len], [1, 1.8]); // the push-through into the problem act
  const owl = ios(f, 4, 200);
  const text: React.CSSProperties = { justifyContent: "center", fontFamily: F.display, fontWeight: 800, fontSize: 150, letterSpacing: -5, color: C.ink, lineHeight: 0.98 };
  return (
    <AbsoluteFill style={{ transform: `scale(${push})` }}>
      {BLOBS.map((b, i) => {
        const p = ios(f, b.at, 160);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: b.x - b.s / 2,
              top: b.y - b.s / 2,
              width: b.s,
              height: b.s * 0.9,
              borderRadius: BLOB,
              background: b.face,
              boxShadow: `0 ${b.s * 0.07}px 0 ${b.depth}, 0 ${b.s * 0.25}px ${b.s * 0.4}px -${b.s * 0.15}px rgba(42,36,32,0.35)`,
              opacity: p,
              transform: `translate(${Math.sin(f / 50 + i) * 14 * b.z}px, ${Math.cos(f / 60 + i * 2) * 18 * b.z - (1 - p) * 160 * b.z}px) scale(${p}) rotate(${f * 0.15 * b.z + i * 40}deg)`,
            }}
          />
        );
      })}
      {CHIPS.map((c) => {
        const p = ios(f, c.at, 180);
        return (
          <div
            key={c.label}
            style={{
              position: "absolute",
              left: c.x,
              top: c.y,
              ...surface("paper", 999, 5),
              padding: "16px 28px",
              fontFamily: F.body,
              fontWeight: 600,
              fontSize: 26,
              color: C.inkMuted,
              opacity: p,
              transform: `translate(-50%, ${(1 - p) * 80 + Math.sin(f / 45 + c.x) * 8}px) scale(${0.8 + 0.2 * p}) rotate(${(1 - p) * 8}deg)`,
              filter: `blur(${(1 - p) * 10}px)`,
            }}
          >
            {c.label}
          </div>
        );
      })}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <Deemo
          size={150}
          lid={blinkAt(f, 1)}
          look={[0, 4]}
          wings={[0, -128 + Math.sin(f / 5) * 18 * owl]}
          style={{ marginBottom: 18, opacity: Math.min(1, owl * 1.5), transform: `translateY(${(1 - owl) * 90}px) scale(${0.6 + 0.4 * owl})` }}
        />
        <Words text="Your *defense*" at={12} stagger={6} style={text} />
        <Words text="is coming." at={24} stagger={6} style={text} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
