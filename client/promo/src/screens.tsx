// What the phone shows, beat by beat, drawn in the app's own UI language at screen size (356×760).
// Every screen takes the absolute frame so it stays in sync with the world around the phone.
import type React from "react";
import { B, FPS } from "./script";
import { C, F, Face, Icon, kf, Owl, popAt, tAt } from "./ui";

export const COURSE_SWITCH = B.panel + 62; // the course flips BSIT → Nursing, on screen and in the world
export const CATCH = B.flag + 48; // the contradiction lands

const Top: React.FC<{ title: string; kicker: string; dark?: boolean }> = ({ title, kicker, dark }) => (
  <div style={{ padding: "62px 26px 0" }}>
    <div style={{ fontFamily: F.mono, fontSize: 13, letterSpacing: 2, color: dark ? C.faint : C.muted }}>{kicker}</div>
    <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 32, color: dark ? C.paper : C.ink, marginTop: 4 }}>{title}</div>
  </div>
);

function Splash({ f }: { f: number }) {
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: C.paper }}>
      <Owl mood="waving" size={210} style={{ translate: `0 ${Math.sin(f / 7) * 6}px` }} />
      <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 48, color: C.ink, marginTop: 18 }}>DEEMO</div>
    </div>
  );
}

const ROWS = [
  { k: "PROBLEM", v: "Long registrar queues" },
  { k: "OBJECTIVES", v: "3 objectives found" },
  { k: "METHOD", v: "Descriptive · survey" },
  { k: "KEY FACT", v: "30 respondents", amber: true },
  { k: "FIELD", v: "BSIT", sage: true },
];
function Analysis({ f }: { f: number }) {
  const t0 = B.upload + 24;
  const prog = tAt(f, t0, t0 + 26);
  return (
    <div style={{ position: "absolute", inset: 0, background: C.paper }}>
      <Top kicker="MANUSCRIPT" title={prog < 1 ? "Reading…" : "Analysis"} />
      <div style={{ margin: "18px 26px", height: 8, borderRadius: 4, background: C.sand }}>
        <div style={{ width: `${prog * 100}%`, height: "100%", borderRadius: 4, background: C.dusk }} />
      </div>
      {ROWS.map((r, i) => {
        const p = popAt(f, FPS, t0 + 20 + i * 5, 14);
        return (
          <div
            key={r.k}
            style={{
              margin: "0 26px 12px",
              padding: "16px 18px",
              borderRadius: 18,
              background: r.amber ? C.amberTint : r.sage ? C.sageTint : "#fff",
              border: `1.5px solid ${C.border}`,
              opacity: Math.min(1, p * 1.5),
              translate: `0 ${(1 - p) * 40}px`,
            }}
          >
            <div style={{ fontFamily: F.mono, fontSize: 12, letterSpacing: 1.5, color: r.amber ? C.amberInk : r.sage ? C.sageInk : C.muted }}>{r.k}</div>
            <div style={{ fontFamily: F.body, fontWeight: 700, fontSize: 20, color: C.ink, marginTop: 4 }}>{r.v}</div>
          </div>
        );
      })}
    </div>
  );
}

function PanelSetup({ f }: { f: number }) {
  const nursing = f >= COURSE_SWITCH;
  const flip = kf(f, [COURSE_SWITCH - 5, COURSE_SWITCH, COURSE_SWITCH + 6], [1, 0, 1]);
  const people = [
    { p: 0, n: "Dr. Reyes", r: "Chair" },
    { p: 1, n: nursing ? "Dr. Santos" : "Engr. Santos", r: nursing ? "Clinical" : "Technical" },
    { p: 2, n: "Prof. Cruz", r: "Methodology" },
  ];
  return (
    <div style={{ position: "absolute", inset: 0, background: C.paper }}>
      <Top kicker="SETUP" title="Your panel" />
      <div style={{ margin: "18px 26px", display: "inline-block", padding: "8px 16px", borderRadius: 999, background: C.ink, color: C.paper, fontFamily: F.body, fontWeight: 700, fontSize: 16 }}>
        {nursing ? "Nursing & Health" : "BSIT"}
      </div>
      {people.map((x, i) => (
        <div
          key={x.p}
          style={{
            margin: "0 26px 14px",
            padding: 16,
            borderRadius: 20,
            display: "flex",
            alignItems: "center",
            gap: 16,
            background: i === 1 ? C.duskTint : "#fff",
            border: `1.5px solid ${i === 1 ? C.dusk : C.border}`,
            scale: i === 1 ? `1 ${flip}` : "1",
          }}
        >
          <Face persona={x.p} size={64} />
          <div>
            <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 21, color: C.ink }}>{x.n}</div>
            <div style={{ fontFamily: F.mono, fontSize: 12, letterSpacing: 1.5, color: i === 1 ? C.duskInk : C.muted, textTransform: "uppercase" }}>{x.r}</div>
          </div>
        </div>
      ))}
      <div style={{ margin: "26px 26px 0", padding: "18px 0", borderRadius: 999, background: C.dusk, color: C.paper, textAlign: "center", fontFamily: F.body, fontWeight: 700, fontSize: 20 }}>
        Start practice
      </div>
    </div>
  );
}

const Q = "How did you test the system's reliability?";
function Session({ f }: { f: number }) {
  const t0 = B.ask + 14;
  const shown = Math.round(kf(f, [t0, t0 + 34], [0, Q.length], (x) => x));
  const speaking = f < t0 + 40;
  return (
    <div style={{ position: "absolute", inset: 0, background: C.paper, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ marginTop: 70, fontFamily: F.mono, fontSize: 13, letterSpacing: 2, color: C.muted }}>PRE-ORAL · 04:12</div>
      <div style={{ position: "relative", marginTop: 24 }}>
        {[0, 1].map((r) => {
          const t = ((f + r * 15) % 30) / 30;
          return <div key={r} style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `3px solid ${C.dusk}`, scale: String(1 + t * 0.3), opacity: speaking ? (1 - t) * 0.7 : 0 }} />;
        })}
        <Face persona={1} size={170} />
      </div>
      <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 22, color: C.ink, marginTop: 14 }}>Engr. Santos</div>
      <div style={{ margin: "22px 22px 0", alignSelf: "stretch", background: "#fff", borderRadius: 22, padding: 20, border: `1.5px solid ${C.border}`, minHeight: 150 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <span style={{ fontFamily: F.mono, fontSize: 11, padding: "4px 10px", borderRadius: 999, background: C.duskTint, color: C.duskInk }}>TECHNICAL</span>
          <span style={{ fontFamily: F.mono, fontSize: 11, padding: "4px 10px", borderRadius: 999, background: C.amberTint, color: C.amberInk, opacity: f > B.ask + 48 ? 1 : 0 }}>FOLLOW-UP 1/2</span>
        </div>
        <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 25, lineHeight: 1.2, color: C.ink }}>{Q.slice(0, shown)}</div>
      </div>
      <div style={{ position: "absolute", bottom: 60, display: "flex", alignItems: "center", gap: 5, height: 60 }}>
        {Array.from({ length: 22 }, (_, i) => (
          <div key={i} style={{ width: 6, borderRadius: 3, background: C.dusk, height: speaking ? 6 : 8 + Math.abs(Math.sin(f / 3 + i * 0.8) * Math.sin(f / 7 + i * 0.3)) * 50 }} />
        ))}
      </div>
    </div>
  );
}

function Transcript({ f }: { f: number }) {
  const hi = tAt(f, CATCH - 4, CATCH + 6);
  const bar = popAt(f, FPS, CATCH + 2, 12);
  return (
    <div style={{ position: "absolute", inset: 0, background: C.paper }}>
      <Top kicker="LIVE TRANSCRIPT" title="Pre-Oral" />
      <div style={{ margin: "22px 22px 14px", padding: 18, borderRadius: "20px 20px 20px 6px", background: "#fff", border: `1.5px solid ${C.border}`, fontFamily: F.body, fontSize: 19, color: C.inkSoft }}>
        How many respondents did you survey?
      </div>
      <div style={{ margin: "0 22px 0 60px", padding: 18, borderRadius: "20px 20px 6px 20px", background: C.duskTint, fontFamily: F.body, fontWeight: 500, fontSize: 21, color: C.ink, lineHeight: 1.35 }}>
        We surveyed <span style={{ background: `rgba(235,179,83,${0.6 * hi})`, borderRadius: 6, padding: "0 4px" }}>forty</span> students from three sections.
      </div>
      <div
        style={{
          position: "absolute",
          left: 18,
          right: 18,
          bottom: 40,
          padding: 18,
          borderRadius: 20,
          background: C.amberTint,
          border: `2px solid ${C.amber}`,
          display: "flex",
          gap: 12,
          alignItems: "center",
          translate: `0 ${(1 - bar) * 200}px`,
        }}
      >
        <Icon name="warning" size={30} color={C.amberInk} />
        <div style={{ fontFamily: F.body, fontSize: 17, color: C.amberInk }}>
          <b>Check this:</b> your paper says 30.
        </div>
      </div>
    </div>
  );
}

const RING = 120;
function Report({ f }: { f: number }) {
  const t0 = B.report + 16;
  const v = kf(f, [t0, t0 + 40], [0, 0.82]);
  const circ = 2 * Math.PI * RING;
  return (
    <div style={{ position: "absolute", inset: 0, background: C.paper, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <Top kicker="RESULTS" title="Readiness" />
      <div style={{ position: "relative", marginTop: 26 }}>
        <svg width={RING * 2 + 30} height={RING * 2 + 30} style={{ rotate: "-90deg" }}>
          <circle cx={RING + 15} cy={RING + 15} r={RING} fill="none" stroke={C.sand} strokeWidth={22} />
          <circle cx={RING + 15} cy={RING + 15} r={RING} fill="none" stroke={C.dusk} strokeWidth={22} strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - v)} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.display, fontWeight: 800, fontSize: 84, color: C.ink }}>
          {Math.round(v * 100)}
        </div>
      </div>
      {[0.86, 0.78, 0.9, 0.72, 0.8].map((l, i) => (
        <div key={i} style={{ alignSelf: "stretch", margin: "16px 30px 0", height: 12, borderRadius: 6, background: C.sand }}>
          <div style={{ width: `${l * tAt(f, t0 + 10 + i * 5, t0 + 36 + i * 5) * 100}%`, height: "100%", borderRadius: 6, background: i === 3 ? C.amber : C.dusk }} />
        </div>
      ))}
    </div>
  );
}

// Which screen shows when; each change dissolves over a few frames with a slight push.
const SCREENS: { at: number; El: React.FC<{ f: number }> }[] = [
  { at: 0, El: Splash },
  { at: B.upload + 18, El: Analysis },
  { at: B.panel + 10, El: PanelSetup },
  { at: B.ask + 8, El: Session },
  { at: B.flag + 10, El: Transcript },
  { at: B.report + 14, El: Report }, // mid-spin, while the screen faces away
];
const XFADE = 8;

export const Screen: React.FC<{ f: number }> = ({ f }) => {
  const i = SCREENS.findLastIndex((s) => f >= s.at);
  const cur = SCREENS[i]!;
  const prev = SCREENS[i - 1];
  const t = tAt(f, cur.at, cur.at + XFADE);
  return (
    <>
      {prev && t < 1 ? (
        <div style={{ position: "absolute", inset: 0 }}>
          <prev.El f={f} />
        </div>
      ) : null}
      <div style={{ position: "absolute", inset: 0, opacity: prev ? t : 1, scale: String(prev ? 1.04 - 0.04 * t : 1) }}>
        <cur.El f={f} />
      </div>
    </>
  );
};
