// Use case: live session. The phone (persistent layer) sits left of centre showing the session; this scene writes the
// beats on the right. As in the app, the screen itself doesn't mark the contradiction (the panelist challenges it
// out loud); the amber card beside it is the note that lands in the report.
import type React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ios, t } from "../motion";
import { LIVE } from "../screens";
import { C, F, Icon, surface, Words } from "../ui";

export const Live: React.FC<{ len: number }> = ({ len }) => {
  const f = useCurrentFrame();
  const line: React.CSSProperties = { fontFamily: F.display, fontWeight: 800, fontSize: 70, letterSpacing: -2.5, color: C.ink, lineHeight: 1.06 };
  const pop = ios(f, LIVE.flag, 200);
  const popOut = t(f, LIVE.score - 8, LIVE.score + 12);
  return (
    <AbsoluteFill style={{ perspective: 1600 }}>
      <div style={{ position: "absolute", left: 1000, top: 330, width: 880 }}>
        <Words text="Asks out loud." at={LIVE.ask - 10} out={len - 34} style={line} />
        <Words text="Follows up." at={LIVE.answer - 10} out={len - 32} style={line} />
        <Words text="Catches *contradictions.*" at={LIVE.flag - 6} out={len - 30} accent={C.amberInk} style={line} />
      </div>
      {/* the contradiction, popping out of the screen */}
      <div
        style={{
          position: "absolute",
          left: 1020,
          top: 640,
          width: 600,
          ...surface("amber", 24, 6),
          padding: "22px 26px",
          opacity: Math.min(1, pop * 1.5) * (1 - popOut),
          transform: `translate3d(${(1 - pop) * -480}px, ${(1 - pop) * -60 - popOut * 60}px, ${pop * 80}px) rotateY(${(1 - pop) * 50 - 6}deg) scale(${0.5 + 0.5 * pop})`,
          filter: `blur(${(1 - pop) * 10 + popOut * 10}px)`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: F.display, fontWeight: 700, fontSize: 26, color: C.amberInk }}>
          <Icon name="warning" size={26} color={C.amber} /> Contradiction, saved to your report
        </div>
        <div style={{ marginTop: 10, fontFamily: F.body, fontSize: 22, lineHeight: 1.4, color: C.inkSoft }}>
          You said <b>45 respondents</b>. Chapter 3 says <b>30</b>.
        </div>
      </div>
    </AbsoluteFill>
  );
};
