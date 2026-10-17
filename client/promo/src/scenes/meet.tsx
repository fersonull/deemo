import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, F, lerp, Owl, Sfx, useT, usePop, Voice } from "../ui";

const WORD = "DEEMO".split("");
const STAGES = ["Title", "Pre-Oral", "Final"];

// "Meet DEEMO. The AI mock panel that lets you practice your research defense, out loud."
export const Meet = () => {
  const frame = useCurrentFrame();
  const owl = usePop(10, 10);
  const sub = useT(54, 74);
  const p0 = usePop(140);
  const p1 = usePop(148);
  const p2 = usePop(156);
  const pills = [p0, p1, p2];
  const letters = [usePop(22), usePop(26), usePop(30), usePop(34), usePop(38)];
  const wave = Math.sin(frame / 5) * 6;

  return (
    <AbsoluteFill style={{ backgroundColor: C.paper, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 110 }}>
      <Voice line="meet" />
      <Sfx id="pop" at={10} volume={0.7} />
      <Sfx id="sparkle" at={24} volume={0.5} />
      <Sfx id="click" at={140} />
      <Sfx id="click" at={148} />
      <Sfx id="click" at={156} />

      {/* soft dusk halo behind the owl */}
      <div style={{ position: "relative", width: 560, height: 600, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
        <div
          style={{
            position: "absolute",
            inset: "60px 20px 0",
            background: C.duskTint,
            borderRadius: "58% 42% 52% 48% / 55% 50% 50% 45%",
            scale: String(owl),
          }}
        />
        <Owl
          mood="waving"
          size={500}
          style={{ position: "relative", translate: `0 ${lerp(owl, 420, 0)}px`, rotate: `${wave * owl}deg`, transformOrigin: "50% 90%" }}
        />
      </div>

      <div>
        <div style={{ display: "flex", fontFamily: F.display, fontWeight: 800, fontSize: 260, lineHeight: 0.9, color: C.ink, letterSpacing: -6 }}>
          {WORD.map((l, i) => (
            <span key={i} style={{ display: "inline-block", scale: String(letters[i]), translate: `0 ${lerp(letters[i]!, 80, 0)}px`, color: i === 0 ? C.dusk : C.ink }}>
              {l}
            </span>
          ))}
        </div>
        <div style={{ fontFamily: F.body, fontSize: 58, fontWeight: 500, color: C.inkMuted, marginTop: 28, opacity: sub, translate: `0 ${lerp(sub, 24, 0)}px`, maxWidth: 820, lineHeight: 1.2 }}>
          Your AI mock panel for the research defense.
        </div>
        <div style={{ display: "flex", gap: 20, marginTop: 48 }}>
          {STAGES.map((s, i) => (
            <div
              key={s}
              style={{
                fontFamily: F.mono,
                fontSize: 32,
                padding: "14px 30px",
                borderRadius: 999,
                background: i === 2 ? C.ink : C.sand,
                color: i === 2 ? C.paper : C.inkSoft,
                scale: String(pills[i]),
              }}
            >
              {s}
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
