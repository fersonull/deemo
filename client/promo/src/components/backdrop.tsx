// The one background under the whole film, in the app's palette: warm paper with slow drifting blobs (the app's
// organic shape) tinted by each step's colour (dusk, sage, amber), and dusk for the call to action. Colours cross-fade.
import type React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { kc, kf } from "../motion";
import { S, TOTAL } from "../script";
import { BLOB, C } from "../ui";

const ACTS = {
  light: { base: C.paper, blobs: [C.duskTint, C.sand, C.duskSoft, C.amberTint, C.sand] },
  upload: { base: C.paper, blobs: [C.duskTint, C.duskSoft, C.sand, C.duskTint, C.sand] },
  defend: { base: C.paper, blobs: [C.sageTint, C.sand, C.duskTint, C.sageTint, C.sand] },
  improve: { base: C.paper, blobs: [C.amberTint, C.sand, C.sageTint, C.amberTint, C.clayTint] },
  cta: { base: C.dusk, blobs: [C.duskIcon, "#7280D6", C.duskInk, "#8D97E0", C.duskIcon] },
};
// Centre (% of the frame), size (px) and drift phase.
const BLOBS = [
  { x: 14, y: 20, s: 900, ph: 0 },
  { x: 86, y: 16, s: 760, ph: 1.7 },
  { x: 74, y: 86, s: 1000, ph: 3.1 },
  { x: 20, y: 88, s: 720, ph: 4.4 },
  { x: 52, y: 48, s: 560, ph: 5.6 },
];

export const Backdrop: React.FC = () => {
  const f = useCurrentFrame();
  const times = [0, S.upload - 10, S.upload + 30, S.defend - 10, S.defend + 30, S.improve - 10, S.improve + 30, S.cta - 10, S.cta + 40, TOTAL];
  const acts = [ACTS.light, ACTS.light, ACTS.upload, ACTS.upload, ACTS.defend, ACTS.defend, ACTS.improve, ACTS.improve, ACTS.cta, ACTS.cta];
  const rise = kf(f, [S.cta - 20, S.cta + 60], [0, 1]); // the CTA lifts: blobs slide down

  return (
    <AbsoluteFill style={{ background: kc(f, times, acts.map((a) => a.base)), overflow: "hidden" }}>
      {BLOBS.map((b, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${b.x}%`,
            top: `${b.y}%`,
            width: b.s,
            height: b.s * 0.86,
            marginLeft: -b.s / 2,
            marginTop: -b.s * 0.43,
            borderRadius: BLOB,
            background: kc(f, times, acts.map((a) => a.blobs[i]!)),
            filter: "blur(70px)",
            opacity: 0.85,
            transform: `translate(${Math.sin(f / 120 + b.ph) * 80}px, ${Math.cos(f / 150 + b.ph) * 60 + rise * 320}px) rotate(${f * 0.04 + b.ph * 40}deg)`,
          }}
        />
      ))}
    </AbsoluteFill>
  );
};
