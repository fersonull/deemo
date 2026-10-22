// Hook: two kinetic lines, centred on the light backdrop. The first steps back to faint when the question lands.
import type React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { kc, t } from "../motion";
import { C, F, Words } from "../ui";

export const HOOK_Q = 84; // frames in, when "But can you defend it…" lands (with the voiceover)

export const Hook: React.FC<{ len: number }> = ({ len }) => {
  const f = useCurrentFrame();
  const back = t(f, HOOK_Q - 6, HOOK_Q + 14);
  const text: React.CSSProperties = { justifyContent: "center", fontFamily: F.display, fontWeight: 800, fontSize: 104, letterSpacing: -3.5, lineHeight: 1.06 };
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 1600, transform: `translateY(${-back * 20}px)` }}>
        <div style={{ color: kc(back, [0, 1], [C.ink, C.faint]) }}>
          <Words text="You know your paper." at={6} out={len - 40} stagger={4} style={text} />
        </div>
        <div style={{ color: C.ink }}>
          <Words text="But can you *defend* it out loud?" at={HOOK_Q} out={len - 36} stagger={4} style={text} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
