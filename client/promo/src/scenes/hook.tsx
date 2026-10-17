import { AbsoluteFill, interpolate } from "remotion";
import { C, F, Kicker, lerp, Sfx, useT, usePop, Voice } from "../ui";

// "Three days until your defense. And your panel has read every page."
export const Hook = () => {
  const three = usePop(8, 9);
  const days = useT(16, 34);
  const line2 = useT(72, 92);
  const mark = useT(110, 128);
  const tickT = useT(8, 140);

  return (
    <AbsoluteFill style={{ backgroundColor: C.ink, color: C.paper, padding: "0 180px", justifyContent: "center" }}>
      <Voice line="hook" />
      <Sfx id="hit" at={8} volume={0.8} />
      <Sfx id="tick" at={36} />
      <Sfx id="tick" at={51} />
      <Sfx id="tick" at={66} />
      <Sfx id="whoosh" at={70} volume={0.4} />

      <Kicker color={C.faint} style={{ opacity: days, marginBottom: 32 }}>T-minus</Kicker>
      <div style={{ display: "flex", alignItems: "baseline", gap: 48 }}>
        <div
          style={{
            fontFamily: F.display,
            fontWeight: 800,
            fontSize: 420,
            lineHeight: 0.8,
            color: C.amber,
            scale: String(three),
            rotate: `${lerp(three, -12, 0)}deg`,
          }}
        >
          3
        </div>
        <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 132, lineHeight: 1, opacity: days, translate: `${lerp(days, 60, 0)}px 0` }}>
          days until
          <br />
          your defense.
        </div>
      </div>

      <div
        style={{
          marginTop: 80,
          fontFamily: F.body,
          fontSize: 64,
          fontWeight: 500,
          color: C.sand,
          opacity: line2,
          translate: `0 ${lerp(line2, 30, 0)}px`,
        }}
      >
        And your panel has read{" "}
        <span style={{ color: C.paper, fontWeight: 700, padding: "0 6px", backgroundImage: `linear-gradient(${C.dusk}, ${C.dusk})`, backgroundRepeat: "no-repeat", backgroundPosition: "0 88%", backgroundSize: `${mark * 100}% 34%` }}>
          every page.
        </span>
      </div>

      {/* the clock running down, a thin bar across the bottom */}
      <div style={{ position: "absolute", left: 0, bottom: 0, height: 10, width: "100%", background: C.inkSoft }}>
        <div style={{ height: "100%", width: `${interpolate(tickT, [0, 1], [100, 8])}%`, background: C.amber }} />
      </div>
    </AbsoluteFill>
  );
};
