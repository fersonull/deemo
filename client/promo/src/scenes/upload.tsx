import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { C, F, Icon, Kicker, lerp, popAt, Sfx, useT, usePop, Voice } from "../ui";

// What Document Logic Analysis pulls out (structure, then the checkable facts and the detected field).
const CHIPS: { text: string; tone: "dusk" | "amber" | "sage"; at: number }[] = [
  { text: "Problem", tone: "dusk", at: 96 },
  { text: "Objectives", tone: "dusk", at: 106 },
  { text: "Methodology", tone: "dusk", at: 116 },
  { text: "Scope & limits", tone: "dusk", at: 126 },
  { text: "30 respondents", tone: "amber", at: 170 },
  { text: "Pilot: 2 weeks", tone: "amber", at: 180 },
  { text: "Field · BSIT", tone: "sage", at: 214 },
];
const TONE = {
  dusk: { bg: "#fff", fg: C.duskInk },
  amber: { bg: C.amberTint, fg: C.amberInk },
  sage: { bg: C.sageTint, fg: C.sageInk },
};

// "Upload your manuscript. DEEMO reads it, maps your objectives and methods, and finds every fact a panel could check."
export const Upload = () => {
  const frame = useCurrentFrame();
  const head = useT(6, 26);
  const page = usePop(14, 14);
  const scan = interpolate(frame, [44, 110], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const { fps } = useVideoConfig();
  const pops = CHIPS.map((c) => popAt(frame, fps, c.at, 11));

  return (
    <AbsoluteFill style={{ backgroundColor: C.duskTint, padding: "110px 150px", flexDirection: "row", alignItems: "center", gap: 120 }}>
      <Voice line="upload" />
      <Sfx id="paper" at={14} volume={0.7} />
      <Sfx id="scan" at={44} volume={0.35} />
      {CHIPS.map((c) => (
        <Sfx key={c.text} id="pop" at={c.at} volume={0.35} />
      ))}

      {/* the manuscript */}
      <div
        style={{
          position: "relative",
          width: 560,
          height: 740,
          background: "#fff",
          borderRadius: 28,
          padding: 56,
          boxShadow: "0 40px 80px rgba(52,57,150,0.18)",
          translate: `0 ${lerp(page, -900, 0)}px`,
          rotate: `${lerp(page, -14, -3)}deg`,
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 36 }}>
          <Icon name="doc" size={52} color={C.dusk} />
          <div style={{ fontFamily: F.mono, fontSize: 24, color: C.muted, letterSpacing: 2 }}>CAPSTONE.PDF</div>
        </div>
        <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 40, color: C.ink, lineHeight: 1.15, marginBottom: 36 }}>
          A Queue Management System for Campus Registrars
        </div>
        {[92, 100, 84, 96, 70, 100, 88, 60, 94, 78].map((w, i) => (
          <div key={i} style={{ height: 16, width: `${w}%`, borderRadius: 8, background: i === 5 ? C.amberTint : C.sand, marginBottom: 22 }} />
        ))}
        {/* scan sweep */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: `${scan * 100}%`,
            height: 120,
            translate: "0 -100%",
            background: `linear-gradient(to bottom, transparent, ${C.dusk}55)`,
            borderBottom: `5px solid ${C.dusk}`,
            opacity: scan > 0 && scan < 1 ? 1 : 0,
          }}
        />
      </div>

      <div style={{ flex: 1 }}>
        <Kicker color={C.duskInk} style={{ opacity: head }}>01 · Upload</Kicker>
        <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 132, lineHeight: 0.95, color: C.ink, marginTop: 20, opacity: head, translate: `0 ${lerp(head, 30, 0)}px` }}>
          It reads your
          <br />
          whole paper.
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 20, marginTop: 64, maxWidth: 900 }}>
          {CHIPS.map((c, i) => (
            <div
              key={c.text}
              style={{
                fontFamily: F.body,
                fontWeight: 700,
                fontSize: 44,
                padding: "16px 34px",
                borderRadius: 999,
                background: TONE[c.tone].bg,
                color: TONE[c.tone].fg,
                border: `3px solid ${TONE[c.tone].fg}22`,
                scale: String(pops[i]),
                translate: `${lerp(pops[i]!, -160, 0)}px 0`,
                opacity: Math.min(1, pops[i]! * 2),
              }}
            >
              {c.text}
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
