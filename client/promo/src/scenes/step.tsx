// The middle of the film, after the reference cut: a label pill, a big headline and a subline on one side, with the
// persistent phone (Promo's PhoneLayer) on the other. "Meet DEEMO" first, then the three numbered steps.
import type React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Deemo } from "../components/deemo";
import { ios, t } from "../motion";
import type { Line } from "../script";
import { C, F, Words } from "../ui";

type Step = { n?: string; label: string; tint: string; ink: string; title: string; sub: string; side: "left" | "right" };
export const STEPS: Partial<Record<Line, Step>> = {
  meet: { label: "Meet DEEMO", tint: C.duskTint, ink: C.duskInk, title: "Your mock defense *panel.*", sub: "Rehearse your title, pre-oral and final defense, anytime.", side: "left" },
  upload: { n: "1", label: "Upload", tint: C.duskTint, ink: C.duskInk, title: "It reads your *paper* first.", sub: "Every question comes from your own manuscript and course.", side: "right" },
  defend: { n: "2", label: "Defend", tint: C.sageTint, ink: C.sageInk, title: "Answer a live panel, *out loud.*", sub: "Three panelists ask, follow up, and catch contradictions.", side: "left" },
  improve: { n: "3", label: "Improve", tint: C.amberTint, ink: C.amberInk, title: "Know exactly *what to fix.*", sub: "A readiness score, and every place your answers contradict your paper.", side: "right" },
};
// Where the phone sits during each step (px from the frame centre): opposite the words.
export const phoneX = (l: Line) => (STEPS[l]?.side === "left" ? 430 : -430);

export const makeStep = (line: Line): React.FC<{ len: number }> => {
  const s = STEPS[line]!;
  const StepScene: React.FC<{ len: number }> = ({ len }) => {
    const f = useCurrentFrame();
    const pill = ios(f, 8, 200);
    const gone = t(f, len - 60, len - 44); // clear of the phone, which crosses over this side next
    return (
      <AbsoluteFill>
        <div style={{ position: "absolute", top: 330, left: s.side === "left" ? 150 : 1040, width: s.side === "left" ? 760 : 740 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              height: 52,
              padding: s.n ? "0 22px 0 8px" : "0 22px 0 6px",
              borderRadius: 26,
              background: s.tint,
              fontFamily: F.body,
              fontWeight: 700,
              fontSize: 24,
              color: s.ink,
              opacity: Math.min(1, pill * 1.4) * (1 - gone),
              transform: `translateY(${(1 - pill) * 30}px) scale(${0.9 + 0.1 * pill})`,
            }}
          >
            {s.n ? (
              <div style={{ width: 36, height: 36, borderRadius: 11, background: s.ink, color: C.paper, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{s.n}</div>
            ) : (
              <Deemo size={44} lid={1} />
            )}
            {s.label}
          </div>
          <Words
            text={s.title}
            at={14}
            out={len - 66}
            stagger={4}
            accent={s.ink}
            style={{ marginTop: 26, fontFamily: F.display, fontWeight: 800, fontSize: 100, letterSpacing: -3.5, lineHeight: 1.02, color: C.ink }}
          />
          <Words
            text={s.sub}
            at={30}
            out={len - 62}
            stagger={1}
            style={{ marginTop: 26, maxWidth: 640, fontFamily: F.body, fontWeight: 500, fontSize: 34, lineHeight: 1.35, color: C.inkMuted, columnGap: "0.24em" }}
          />
        </div>
      </AbsoluteFill>
    );
  };
  return StepScene;
};
