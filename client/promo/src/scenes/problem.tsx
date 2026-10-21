// Problem: in the ink dark, a ring of panel questions swirls around kinetic lines; at the end the ring collapses into
// one paper card, which the analysis scene picks up.
import type React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ios, kf, t } from "../motion";
import { C, F, surface, Words } from "../ui";

const QUESTIONS = [
  "Why this sample size?",
  "What's out of scope?",
  "How did you test it?",
  "Why not an existing system?",
  "Who are your respondents?",
  "What's new here?",
  "Why this design?",
  "How was it validated?",
];

export const Problem: React.FC<{ len: number }> = ({ len }) => {
  const f = useCurrentFrame();
  const collapse = kf(f, [len - 60, len - 18], [0, 1]);
  const text: React.CSSProperties = { justifyContent: "center", fontFamily: F.display, fontWeight: 700, fontSize: 96, letterSpacing: -3, color: C.paper, lineHeight: 1.04 };
  const mid = Math.round(len * 0.38);
  return (
    <AbsoluteFill style={{ perspective: 1600 }}>
      {QUESTIONS.map((q, i) => {
        const p = ios(f, 8 + i * 5, 150);
        const a = (i / QUESTIONS.length) * Math.PI * 2 + f * 0.006 - (1 - p) * 0.8;
        const radius = (1 - collapse) * (1 - (1 - p) * 0.3);
        const depth = (Math.sin(a) + 1) / 2; // nearer at the bottom of the ring
        return (
          <div
            key={q}
            style={{
              position: "absolute",
              left: 960,
              top: 540,
              borderRadius: 22,
              background: "rgba(247,243,236,0.1)",
              boxShadow: "0 5px 0 rgba(0,0,0,0.35), inset 0 0 0 1.5px rgba(247,243,236,0.16)",
              padding: "18px 26px",
              fontFamily: F.body,
              fontWeight: 500,
              fontSize: 26,
              color: C.paper,
              whiteSpace: "nowrap",
              opacity: p * (0.4 + depth * 0.6) * (1 - t(f, len - 26, len - 14)),
              transform: `translate(-50%, -50%) translate(${Math.cos(a) * 720 * radius}px, ${Math.sin(a) * 330 * radius}px) scale(${(0.72 + depth * 0.38) * (1 - collapse * 0.4)}) rotateY(${Math.cos(a) * -18}deg)`,
              filter: `blur(${(1 - depth) * 3 + (1 - p) * 12}px)`,
            }}
          >
            {q}
          </div>
        );
      })}
      {/* the card the ring collapses into */}
      <div
        style={{
          position: "absolute",
          left: 960,
          top: 540,
          width: 560,
          height: 280,
          ...surface("paper", 30),
          opacity: t(f, len - 30, len - 16),
          transform: `translate(-50%, -50%) scale(${0.4 + 0.6 * ios(f, len - 30)})`,
        }}
      />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: 1 - collapse }}>
        <div style={{ position: "absolute" }}>
          <Words text="You know your paper." at={10} out={mid - 12} stagger={4} style={text} />
        </div>
        <div style={{ position: "absolute" }}>
          <Words text="But can you defend it" at={mid} stagger={4} style={text} />
          <Words text="*out* *loud?*" at={mid + 20} stagger={6} accent={C.duskSoft} style={{ ...text, fontWeight: 800 }} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
