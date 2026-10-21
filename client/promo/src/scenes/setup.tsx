// Use case: setup. The phone (drawn by the persistent phone layer in Promo) sits on the right with the Setup screen;
// this scene only writes the lines on the left, in time with the controls landing.
import type React from "react";
import { AbsoluteFill } from "remotion";
import { CONTROL_AT } from "../screens";
import { C, F, Words } from "../ui";

export const Setup: React.FC<{ len: number }> = ({ len }) => {
  const text: React.CSSProperties = { fontFamily: F.display, fontWeight: 800, fontSize: 92, letterSpacing: -3, color: C.ink, lineHeight: 1.04 };
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 150, top: 330, width: 900 }}>
        <Words text="Pick your stage," at={CONTROL_AT(0) - 12} out={len - 34} style={text} />
        <Words text="your *panel*," at={CONTROL_AT(1) - 6} out={len - 32} style={text} />
        <Words text="and how hard they push." at={CONTROL_AT(3) - 4} out={len - 30} style={{ ...text, fontFamily: F.body, fontSize: 56, letterSpacing: -1.5, color: C.inkMuted, fontWeight: 600, marginTop: 12 }} />
      </div>
    </AbsoluteFill>
  );
};
