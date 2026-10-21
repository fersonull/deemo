// Use case: analysis. The problem's paper card slides right and becomes the first of three analysis cards (from the
// built-in sample paper), which scroll up through the frame one by one, each writing itself in word by word. The
// last card shrinks off to the right, into the phone that swings in next.
import type React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ios, kf, lerp, t } from "../motion";
import { C, F, Icon, surface, Words } from "../ui";

// server/src/modules/practice/domain/agenda.ts SAMPLE_ANALYSIS, shortened.
const CARDS = [
  { kicker: "SUMMARY", body: "ReqTrack lets students see missing enrollment requirements on their phone, and the registrar update them in real time." },
  { kicker: "KEY FACTS", body: "Agile (Scrum) · 30 respondents, purposive sampling · ISO/IEC 25010 survey · weighted mean 3.42" },
  { kicker: "OBJECTIVES", body: "Show students what's missing · update records in real time · evaluate with ISO/IEC 25010." },
];
const GAP = 340;
const CX = 1290;

export const Analysis: React.FC<{ len: number }> = ({ len }) => {
  const f = useCurrentFrame();
  const steps = [80, 140]; // when the column advances to the next card
  const arrive = [14, steps[0]! + 8, steps[1]! + 8];
  const scroll = GAP * (ios(f, steps[0]!, 160) + ios(f, steps[1]!, 160));
  const slide = ios(f, 0, 160); // from the centre (where the problem left it) to the right
  const fly = ios(f, len - 48, 170); // last card into the phone
  const text: React.CSSProperties = { fontFamily: F.display, fontWeight: 800, fontSize: 84, letterSpacing: -3, color: C.ink, lineHeight: 1.02 };

  return (
    <AbsoluteFill style={{ perspective: 1800 }}>
      <div style={{ position: "absolute", left: 150, top: 340, width: 760, opacity: 1 - t(f, len - 40, len - 10) }}>
        <Words text="Upload your manuscript." at={8} stagger={4} style={{ ...text, fontFamily: F.body, color: C.inkMuted, fontWeight: 600, fontSize: 52, letterSpacing: -1.5 }} />
        <Words text="DEEMO *reads*" at={44} stagger={5} style={{ ...text, marginTop: 14 }} />
        <Words text="every page." at={54} stagger={5} style={text} />
      </div>
      {CARDS.map((c, i) => {
        const last = i === CARDS.length - 1;
        const y = 540 + i * GAP - scroll - (last ? 0 : fly * 700);
        const d = (y - 540) / GAP; // 0 = centred, ±1 = a slot away
        const x = lerp(slide, 960, CX) + (last ? fly * 150 : 0);
        const s = (1 - Math.min(1, Math.abs(d)) * 0.16) * (last ? 1 - fly * 0.62 : 1);
        return (
          <div
            key={c.kicker}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: 620,
              padding: "34px 40px",
              ...surface("paper", 32),
              opacity: Math.max(0, 1 - Math.abs(d) * 0.55) * (last ? 1 - t(f, len - 22, len - 6) : 1),
              transform: `translate(-50%, -50%) rotateX(${d * -14}deg) rotateY(${-10 * slide * (1 - fly)}deg) scale(${s})`,
              filter: `blur(${Math.min(1, Math.abs(d)) * 6}px)`,
              overflow: "hidden",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: F.mono, fontSize: 18, letterSpacing: 3, color: C.dusk }}>
              <Icon name="spark" size={20} color={C.dusk} />
              {c.kicker}
            </div>
            <Words text={c.body} at={arrive[i]! + 8} stagger={1} style={{ marginTop: 16, fontFamily: F.body, fontWeight: 500, fontSize: 32, lineHeight: 1.32, color: C.ink, columnGap: "0.24em" }} />
            {/* scan sweep while the card is being read */}
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                height: 120,
                top: kf(f, [arrive[i]!, arrive[i]! + 50], [-140, 420]),
                background: "linear-gradient(180deg, transparent, rgba(90,102,199,0.16) 70%, rgba(90,102,199,0.45) 98%, transparent)",
                opacity: f > arrive[i]! && f < arrive[i]! + 50 ? 1 : 0,
              }}
            />
          </div>
        );
      })}
      {/* the file that drops onto the first card */}
      <div
        style={{
          position: "absolute",
          left: lerp(slide, 960, CX) + 170,
          top: 330,
          display: "flex",
          alignItems: "center",
          gap: 10,
          ...surface("sand", 999, 4),
          padding: "12px 22px 12px 16px",
          fontFamily: F.body,
          fontWeight: 600,
          fontSize: 22,
          color: C.ink,
          opacity: ios(f, 4) * (1 - t(f, steps[0]! - 16, steps[0]!)),
          transform: `translateY(${(1 - ios(f, 4)) * -120}px) rotate(${(1 - ios(f, 4)) * -12 + 4}deg)`,
        }}
      >
        <Icon name="doc" size={24} color={C.dusk} /> ReqTrack.pdf
      </div>
    </AbsoluteFill>
  );
};
