import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, F, Face, Icon, Kicker, lerp, Sfx, useT, usePop, Voice } from "../ui";

const QUESTION = "How did you test the system's reliability with real users?";
const TYPE_FROM = 16;
const TYPE_TO = 70;
const ANSWER = 78; // the student's mic opens
const FOLLOW = 128; // "…and follow up when it's thin"

// "They ask out loud, listen to your answer, and follow up when it's thin. Just like the real thing."
export const Ask = () => {
  const frame = useCurrentFrame();
  const face = usePop(4, 12);
  const card = usePop(12, 14);
  const mic = useT(ANSWER, ANSWER + 14);
  const follow = usePop(FOLLOW, 9);
  const shown = Math.round(interpolate(frame, [TYPE_FROM, TYPE_TO], [0, QUESTION.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const speaking = frame < TYPE_TO + 6;

  return (
    <AbsoluteFill style={{ backgroundColor: C.ink, padding: "110px 150px", flexDirection: "row", alignItems: "center", gap: 110 }}>
      <Voice line="ask" />
      <Sfx id="chime" at={12} volume={0.45} />
      <Sfx id="click" at={ANSWER} volume={0.5} />
      <Sfx id="pop" at={FOLLOW} volume={0.6} />

      {/* the panelist, rings pulsing while they speak */}
      <div style={{ position: "relative", width: 520, height: 520, flexShrink: 0, scale: String(face) }}>
        {[0, 1, 2].map((r) => {
          const t = ((frame + r * 12) % 36) / 36;
          return (
            <div
              key={r}
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                border: `4px solid ${C.duskSoft}`,
                scale: String(1 + t * 0.35),
                opacity: speaking ? (1 - t) * 0.6 : 0,
              }}
            />
          );
        })}
        <Face persona={1} size={520} />
        <div
          style={{
            position: "absolute",
            bottom: -30,
            left: "50%",
            translate: "-50% 0",
            whiteSpace: "nowrap",
            fontFamily: F.body,
            fontWeight: 700,
            fontSize: 36,
            padding: "12px 30px",
            borderRadius: 999,
            background: C.paper,
            color: C.ink,
          }}
        >
          Engr. Santos
        </div>
      </div>

      <div style={{ flex: 1 }}>
        <Kicker color={C.faint}>03 · Out loud</Kicker>
        <div
          style={{
            marginTop: 28,
            background: C.paper,
            borderRadius: 40,
            padding: "52px 60px",
            scale: String(card),
            transformOrigin: "left center",
          }}
        >
          <div style={{ display: "flex", gap: 16, marginBottom: 28 }}>
            <div style={{ fontFamily: F.mono, fontSize: 26, letterSpacing: 3, padding: "8px 20px", borderRadius: 999, background: C.duskTint, color: C.duskInk }}>
              TECHNICAL
            </div>
            <div
              style={{
                fontFamily: F.mono,
                fontSize: 26,
                letterSpacing: 3,
                padding: "8px 20px",
                borderRadius: 999,
                background: C.amberTint,
                color: C.amberInk,
                scale: String(follow),
              }}
            >
              FOLLOW-UP 1 OF 2
            </div>
          </div>
          <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 72, lineHeight: 1.12, color: C.ink, minHeight: 240 }}>
            {QUESTION.slice(0, shown)}
            <span style={{ opacity: shown < QUESTION.length && frame % 16 < 8 ? 1 : 0, color: C.dusk }}>|</span>
          </div>
        </div>

        {/* the student's answer: live mic level */}
        <div style={{ display: "flex", alignItems: "center", gap: 28, marginTop: 44, opacity: mic, translate: `0 ${lerp(mic, 30, 0)}px` }}>
          <div style={{ width: 100, height: 100, borderRadius: "50%", background: C.dusk, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="mic" size={56} color={C.paper} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, height: 100 }}>
            {Array.from({ length: 28 }, (_, i) => {
              const h = 14 + Math.abs(Math.sin(frame / 3.2 + i * 0.9) * Math.sin(frame / 7 + i * 0.35)) * 86;
              return <div key={i} style={{ width: 12, height: h, borderRadius: 6, background: C.duskSoft }} />;
            })}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
