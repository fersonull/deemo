import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, F, lerp, Owl, Sfx, useT, usePop, Voice } from "../ui";

// "DEEMO. Practice the defense, before the defense."
export const Cta = () => {
  const frame = useCurrentFrame();
  const owl = usePop(6, 9);
  const word = usePop(12, 11);
  const line = useT(34, 54);
  const foot = useT(70, 90);
  const bob = Math.sin(frame / 8) * 10;

  return (
    <AbsoluteFill style={{ backgroundColor: C.paper, alignItems: "center", justifyContent: "center" }}>
      <Voice line="cta" />
      <Sfx id="sting" at={6} volume={0.7} />

      <Owl mood="cheering" size={360} style={{ scale: String(owl), translate: `0 ${lerp(owl, 300, 0) + bob}px` }} />
      <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 220, lineHeight: 0.9, color: C.ink, letterSpacing: -6, marginTop: 20, scale: String(word) }}>
        DEEMO
      </div>
      <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 72, color: C.dusk, marginTop: 24, opacity: line, translate: `0 ${lerp(line, 30, 0)}px` }}>
        Practice the defense, before the defense.
      </div>
      <div style={{ fontFamily: F.mono, fontSize: 30, letterSpacing: 4, color: C.muted, marginTop: 48, opacity: foot }}>
        ANDROID · FREE TO START · ANY COURSE
      </div>
    </AbsoluteFill>
  );
};
