import { AbsoluteFill } from "remotion";
import { C, F, Icon, Kicker, lerp, Owl, Sfx, useT, usePop, Voice } from "../ui";

const CATCH = 62; // "…and DEEMO catches it"

// The Live Verbal Consistency Checker. Amber, never red: a nudge, not a failure.
// "Say something your paper doesn't, and DEEMO catches it, gently, before your real panel does."
export const Flag = () => {
  const head = useT(4, 22);
  const paper = usePop(10, 14);
  const said = usePop(30, 14);
  const flag = usePop(CATCH, 10);
  const mark = useT(CATCH - 4, CATCH + 10);
  const owl = usePop(CATCH + 24, 12);

  const quote = { fontFamily: F.display, fontWeight: 700, fontSize: 64, lineHeight: 1.15, color: C.ink } as const;
  const hi = (on: number) => ({ background: `rgba(235,179,83,${0.55 * on})`, borderRadius: 10, padding: "0 8px" });

  return (
    <AbsoluteFill style={{ backgroundColor: C.paper, padding: "110px 150px" }}>
      <Voice line="flag" />
      <Sfx id="paper" at={10} volume={0.4} />
      <Sfx id="click" at={30} volume={0.4} />
      <Sfx id="nudge" at={CATCH} volume={0.75} />

      <Kicker style={{ opacity: head }}>04 · Consistency check</Kicker>
      <div style={{ display: "flex", gap: 48, marginTop: 40 }}>
        <div style={{ flex: 1, background: "#fff", borderRadius: 36, padding: "48px 52px", border: `3px solid ${C.border}`, scale: String(paper), translate: `0 ${lerp(paper, 80, 0)}px` }}>
          <Kicker style={{ fontSize: 24, marginBottom: 22 }}>Your manuscript · Ch. 3</Kicker>
          <div style={quote}>
            “<span style={hi(mark)}>Thirty (30)</span> respondents, chosen by purposive sampling.”
          </div>
        </div>
        <div style={{ flex: 1, background: C.duskTint, borderRadius: 36, padding: "48px 52px", scale: String(said), translate: `0 ${lerp(said, 80, 0)}px` }}>
          <Kicker color={C.duskInk} style={{ fontSize: 24, marginBottom: 22 }}>You said</Kicker>
          <div style={quote}>
            “We surveyed <span style={hi(mark)}>forty</span> students from three sections…”
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 40, marginTop: 56 }}>
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: 28,
            background: C.amberTint,
            border: `4px solid ${C.amber}`,
            borderRadius: 32,
            padding: "36px 48px",
            scale: String(flag),
            rotate: `${lerp(flag, -4, 0)}deg`,
            transformOrigin: "left center",
          }}
        >
          <Icon name="warning" size={76} color={C.amberInk} />
          <div style={{ fontFamily: F.body, fontSize: 44, color: C.amberInk, lineHeight: 1.2 }}>
            <b>Inconsistency flagged.</b> You said 40; your paper says 30.
          </div>
        </div>
        <Owl mood="encouraging" size={240} style={{ scale: String(owl), flexShrink: 0 }} />
      </div>
    </AbsoluteFill>
  );
};
