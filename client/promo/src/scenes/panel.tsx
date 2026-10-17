import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, F, Face, Kicker, lerp, Sfx, useT, usePop, Voice } from "../ui";

// The real lineup (server/src/modules/practice/domain/panel.ts): Reyes chairs, Cruz runs methodology, and Santos is
// whatever expert the course calls for — an engineer for a capstone, a clinician for nursing.
const SWITCH = 148; // "A nursing study…"

// "Then it seats a panel built for your field. A capstone faces an engineer. A nursing study faces a clinician."
export const Panel = () => {
  const frame = useCurrentFrame();
  const head = useT(6, 26);
  const seats = [usePop(24), usePop(32), usePop(40)];
  const spot = useT(86, 100); // Santos lights up on "engineer"
  // Santos's card flips over at the switch: squash to 0, swap, open again.
  const flip = interpolate(frame, [SWITCH - 6, SWITCH, SWITCH + 8], [1, 0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const nursing = frame >= SWITCH;
  const course = nursing ? "Nursing & Health" : "BSIT · Capstone";

  const people = [
    { persona: 0, name: "Dr. Reyes", role: "Chair" },
    { persona: 1, name: nursing ? "Dr. Santos" : "Engr. Santos", role: nursing ? "Clinical" : "Technical" },
    { persona: 2, name: "Prof. Cruz", role: "Methodology" },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: C.paper, padding: "110px 150px", alignItems: "center" }}>
      <Voice line="panel" />
      <Sfx id="pop" at={24} volume={0.5} />
      <Sfx id="pop" at={32} volume={0.5} />
      <Sfx id="pop" at={40} volume={0.5} />
      <Sfx id="chime" at={86} volume={0.4} />
      <Sfx id="whoosh" at={SWITCH - 6} volume={0.45} />
      <Sfx id="click" at={SWITCH} />

      <Kicker style={{ opacity: head }}>02 · Your panel</Kicker>
      <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 120, color: C.ink, marginTop: 16, opacity: head, textAlign: "center", lineHeight: 1 }}>
        Built for your field.
      </div>

      {/* course chip */}
      <div
        style={{
          marginTop: 44,
          display: "flex",
          alignItems: "center",
          gap: 18,
          fontFamily: F.body,
          fontWeight: 700,
          fontSize: 40,
          padding: "14px 36px",
          borderRadius: 999,
          background: C.ink,
          color: C.paper,
          opacity: head,
          scale: String(interpolate(frame, [SWITCH - 6, SWITCH, SWITCH + 10], [1, 0.9, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })),
        }}
      >
        <span style={{ fontFamily: F.mono, fontSize: 26, color: C.faint, letterSpacing: 3 }}>COURSE</span>
        {course}
      </div>

      <div style={{ display: "flex", gap: 56, marginTop: 70 }}>
        {people.map((p, i) => {
          const santos = i === 1;
          return (
            <div
              key={p.persona}
              style={{
                width: 440,
                padding: "48px 32px 40px",
                borderRadius: 36,
                background: santos && spot > 0.5 ? C.duskTint : "#fff",
                border: `4px solid ${santos ? `rgba(90,102,199,${spot})` : C.border}`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                scale: santos ? `${seats[i]! * flip} ${seats[i]}` : String(seats[i]),
                translate: `0 ${lerp(seats[i]!, 120, 0) - (santos ? spot * 24 : 0)}px`,
                boxShadow: santos ? `0 30px 60px rgba(52,57,150,${0.2 * spot})` : "none",
              }}
            >
              <Face persona={p.persona} size={220} />
              <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 52, color: C.ink, marginTop: 28 }}>{p.name}</div>
              <div style={{ fontFamily: F.mono, fontSize: 28, letterSpacing: 3, textTransform: "uppercase", color: santos ? C.duskInk : C.muted, marginTop: 10 }}>
                {p.role}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
