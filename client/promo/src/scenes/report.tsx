import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, F, Kicker, easeOut, lerp, Sfx, tAt, useT, usePop, Voice } from "../ui";

// The five rubric criteria from server/src/modules/scoring/domain/scoring.ts, with a sample result.
const RUBRIC = [
  { name: "Content Mastery", level: 0.86 },
  { name: "Reasoning & Justification", level: 0.78 },
  { name: "Clarity & Organization", level: 0.9 },
  { name: "Consistency with Manuscript", level: 0.72 },
  { name: "Confidence & Delivery", level: 0.8 },
];
const SCORE = 82;
const R = 210;
const CIRC = 2 * Math.PI * R;

// "After every session, you get a readiness score, and feedback you can actually use."
export const Report = () => {
  const frame = useCurrentFrame();
  const head = useT(4, 22);
  const ring = interpolate(frame, [16, 76], [0, SCORE / 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOut });
  const done = usePop(76, 8);
  const bars = RUBRIC.map((_, i) => tAt(frame, 40 + i * 10, 80 + i * 10));
  const tip = useT(110, 128);

  return (
    <AbsoluteFill style={{ backgroundColor: C.dusk, padding: "110px 150px", flexDirection: "row", alignItems: "center", gap: 130 }}>
      <Voice line="report" />
      <Sfx id="riser" at={14} volume={0.35} />
      <Sfx id="ding" at={76} volume={0.6} />

      <div style={{ position: "relative", width: 2 * R + 60, height: 2 * R + 60, flexShrink: 0, scale: String(1 + 0.05 * Math.sin(Math.min(done, 1) * Math.PI)) }}>
        <svg width={2 * R + 60} height={2 * R + 60} style={{ rotate: "-90deg" }}>
          <circle cx={R + 30} cy={R + 30} r={R} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={36} />
          <circle cx={R + 30} cy={R + 30} r={R} fill="none" stroke={C.amber} strokeWidth={36} strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - ring)} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: C.paper }}>
          <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 200, lineHeight: 1 }}>{Math.round(ring * 100)}</div>
          <div style={{ fontFamily: F.mono, fontSize: 30, letterSpacing: 4, color: C.duskTint }}>READINESS</div>
        </div>
      </div>

      <div style={{ flex: 1, color: C.paper }}>
        <Kicker color={C.duskTint} style={{ opacity: head }}>05 · Your report</Kicker>
        <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 96, lineHeight: 1, marginTop: 16, marginBottom: 44, whiteSpace: "nowrap", opacity: head }}>Know you're ready.</div>
        {RUBRIC.map((r, i) => (
          <div key={r.name} style={{ marginBottom: 26 }}>
            <div style={{ fontFamily: F.body, fontWeight: 500, fontSize: 36, marginBottom: 10, opacity: Math.min(1, bars[i]! * 3) }}>{r.name}</div>
            <div style={{ height: 18, borderRadius: 9, background: "rgba(255,255,255,0.18)" }}>
              <div style={{ height: "100%", width: `${r.level * bars[i]! * 100}%`, borderRadius: 9, background: C.paper }} />
            </div>
          </div>
        ))}
        <div style={{ marginTop: 30, fontFamily: F.body, fontSize: 38, color: C.duskTint, opacity: tip, translate: `0 ${lerp(tip, 20, 0)}px` }}>
          Next time: cite your pilot test when asked about reliability.
        </div>
      </div>
    </AbsoluteFill>
  );
};
