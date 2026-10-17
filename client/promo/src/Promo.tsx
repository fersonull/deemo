// One continuous shot. The story is carried by a single 3D phone: elements fly out of its screen into the world and
// back in, the camera drifts and pushes, and the background breathes between beats instead of cutting.
import { Audio } from "@remotion/media";
import type React from "react";
import { AbsoluteFill, interpolate, interpolateColors, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Phone, type Pose } from "./phone";
import { CATCH, COURSE_SWITCH, Screen } from "./screens";
import { B, hasMusic, TOTAL } from "./script";
import { C, easeOut, F, Face, Icon, inOut, kf, Owl, popAt, Sfx, tAt, Voice } from "./ui";

// ── masked word reveal: words rise into place, then lift out ──
const Reveal: React.FC<{ f: number; at: number; out: number; children: string; style?: React.CSSProperties; color?: string }> = ({ f, at, out, children, style, color = C.ink }) => (
  <div style={{ fontFamily: F.display, fontWeight: 800, color, lineHeight: 1.02, ...style }}>
    {children.split(" ").map((w, i) => {
      const inT = tAt(f, at + i * 3, at + i * 3 + 16);
      const outT = tAt(f, out + i * 2, out + i * 2 + 12, inOut);
      return (
        <span key={i} style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top", paddingBottom: "0.08em", marginRight: "0.24em" }}>
          <span style={{ display: "inline-block", translate: `0 ${outT > 0 ? -115 * outT : 115 * (1 - inT)}%`, rotate: `${(1 - inT) * 6}deg`, opacity: inT === 0 || outT === 1 ? 0 : 1 }}>{w}</span>
        </span>
      );
    })}
  </div>
);

// Positioned in world space, centred on (x, y) from the frame's centre.
const At: React.FC<{ x: number; y: number; z?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ x, y, z = 0, children, style }) => (
  <div style={{ position: "absolute", left: "50%", top: "50%", transform: `translate3d(${x}px, ${y}px, ${z}px) translate(-50%, -50%)`, ...style }}>{children}</div>
);

// ── the phone's path: [frame, x, y, z, rotX, rotY, rotZ, scale] ──
const PATH: number[][] = [
  [0, -430, 1250, 0, 40, -40, -25, 1],
  [B.meet + 40, -430, 1250, 0, 40, -40, -25, 1],
  [B.upload + 6, -430, 0, 0, 6, 24, -5, 1],
  [B.panel - 2, -450, 10, 0, 4, 14, -3, 1],
  [B.panel + 20, 470, 0, 0, 6, -24, 4, 1],
  [B.ask - 2, 480, 0, 0, 4, -16, 2, 1],
  [B.ask + 18, 0, 30, 0, 8, 0, 0, 1.22],
  [B.flag - 2, 0, 20, 0, 4, -6, 0, 1.26],
  [B.flag + 18, -400, 0, 0, 6, 20, -3, 1.05],
  [B.report - 2, -410, 0, 0, 4, 14, -2, 1.05],
  [B.report + 28, 430, 0, 0, 6, 340, 3, 1.05],
  [B.cta - 2, 440, 0, 0, 4, 334, 2, 1.05],
  [B.cta + 24, 0, -80, -1100, 14, 360, 0, 0.9],
];
function poseAt(f: number): Pose {
  const t = PATH.map((k) => k[0]!);
  const col = (i: number) => kf(f, t, PATH.map((k) => k[i]!));
  // never perfectly still: a slow float and sway on top of the path
  return {
    x: col(1),
    y: col(2) + Math.sin(f / 26) * 9,
    z: col(3),
    rx: col(4) + Math.sin(f / 33) * 2,
    ry: col(5) + Math.sin(f / 41) * 3,
    rz: col(6) + (f > CATCH && f < CATCH + 24 ? Math.sin((f - CATCH) * 1.1) * 4 * (1 - (f - CATCH) / 24) : 0),
    s: col(7),
    o: kf(f, [B.cta + 12, B.cta + 24], [1, 0]),
  };
}

// Background per beat, cross-blended at each boundary.
const BG: [number, string][] = [
  [0, C.ink],
  [B.meet + 2, C.ink],
  [B.meet + 3, C.paper],
  [B.upload, C.paper],
  [B.upload + 14, C.duskTint],
  [B.panel, C.duskTint],
  [B.panel + 14, C.paper],
  [B.ask, C.paper],
  [B.ask + 14, C.ink],
  [B.flag, C.ink],
  [B.flag + 14, C.paper],
  [B.report, C.paper],
  [B.report + 14, C.dusk],
  [B.cta, C.dusk],
  [B.cta + 14, C.paper],
];

const CHIPS = [
  { t: "Problem", x: 130, y: -40, z: -60, tone: "w" },
  { t: "Objectives", x: 470, y: -80, z: 40, tone: "w" },
  { t: "Methodology", x: 150, y: 60, z: 80, tone: "w" },
  { t: "Scope & limits", x: 590, y: 40, z: -120, tone: "w" },
  { t: "30 respondents", x: 250, y: 170, z: 0, tone: "a" },
  { t: "Field · BSIT", x: 600, y: 170, z: 60, tone: "s" },
];
const CARDS = [
  { p: 0, x: -660, y: 70, z: -120, rot: -6 },
  { p: 1, x: -350, y: 10, z: 40, rot: 0 },
  { p: 2, x: -40, y: 70, z: -120, rot: 6 },
];
const RUBRIC = ["Content Mastery", "Reasoning & Justification", "Clarity & Organization", "Consistency with Manuscript", "Confidence & Delivery"];
const LEVELS = [0.86, 0.78, 0.9, 0.72, 0.8];

export const Promo = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pose = poseAt(f);
  const bg = interpolateColors(f, BG.map((b) => b[0]), BG.map((b) => b[1]));
  const pop = (at: number, d = 12) => popAt(f, fps, at, d);

  // hook → meet: the amber "3" swallows the frame, then paper opens from the centre
  const zoom3 = kf(f, [B.meet - 12, B.meet + 4], [1, 70], (x) => x * x * x);
  const circle = kf(f, [B.meet + 2, B.meet + 20], [0, 1], easeOut);

  // meet: the owl pops, then flies into the rising phone and becomes its splash screen
  const owlIn = pop(B.meet + 6, 10);
  const owlFly = tAt(f, B.meet + 44, B.upload + 6, inOut);
  const owlOn = f < B.upload + 6;

  // camera: slow drift plus a push on each beat
  const cam = 1 + 0.025 * Math.sin(f / 60) + 0.03 * kf(f, [B.ask, B.ask + 20, B.flag, B.flag + 20], [0, 1, 1, 0]);

  return (
    <AbsoluteFill style={{ backgroundColor: bg, overflow: "hidden" }}>
      {/* ── sound ── */}
      {hasMusic ? (
        <Audio name="Music" src={staticFile("audio/music.mp3")} loop volume={kf(f, [0, 15, TOTAL - 40, TOTAL - 1], [0, 0.2, 0.2, 0])} />
      ) : null}
      <Voice line="hook" />
      <Voice line="meet" />
      <Voice line="upload" />
      <Voice line="panel" />
      <Voice line="ask" />
      <Voice line="flag" />
      <Voice line="report" />
      <Voice line="cta" />
      <Sfx id="hit" at={4} volume={0.7} />
      <Sfx id="tick" at={30} volume={0.4} />
      <Sfx id="whoosh" at={B.meet - 12} volume={0.5} />
      <Sfx id="pop" at={B.meet + 6} volume={0.7} />
      <Sfx id="sparkle" at={B.meet + 16} volume={0.4} />
      <Sfx id="whoosh" at={B.meet + 42} volume={0.45} />
      <Sfx id="paper" at={B.upload + 6} volume={0.5} />
      <Sfx id="scan" at={B.upload + 24} volume={0.25} />
      <Sfx id="pop" at={B.upload + 40} volume={0.35} />
      <Sfx id="pop" at={B.upload + 48} volume={0.35} />
      <Sfx id="pop" at={B.upload + 56} volume={0.35} />
      <Sfx id="whoosh" at={B.panel} volume={0.45} />
      <Sfx id="pop" at={B.panel + 20} volume={0.4} />
      <Sfx id="pop" at={B.panel + 26} volume={0.4} />
      <Sfx id="pop" at={B.panel + 32} volume={0.4} />
      <Sfx id="click" at={COURSE_SWITCH} volume={0.6} />
      <Sfx id="whoosh" at={B.ask} volume={0.45} />
      <Sfx id="chime" at={B.ask + 14} volume={0.35} />
      <Sfx id="pop" at={B.ask + 48} volume={0.5} />
      <Sfx id="whoosh" at={B.flag} volume={0.4} />
      <Sfx id="nudge" at={CATCH} volume={0.7} />
      <Sfx id="whoosh" at={B.report} volume={0.5} />
      <Sfx id="riser" at={B.report + 8} volume={0.3} />
      <Sfx id="ding" at={B.report + 56} volume={0.5} />
      <Sfx id="whoosh" at={B.cta} volume={0.4} />
      <Sfx id="sting" at={B.cta + 10} volume={0.7} />

      {/* ── ambient: drifting light and a slow dot grid, so the frame is never flat ── */}
      <div
        style={{
          position: "absolute",
          inset: -100,
          backgroundImage: "radial-gradient(rgba(42,36,32,0.07) 2px, transparent 2px)",
          backgroundSize: "44px 44px",
          backgroundPosition: `${f * 0.4}px ${f * 0.25}px`,
          opacity: f < B.meet ? 0 : 1,
        }}
      />
      <div style={{ position: "absolute", width: 900, height: 900, borderRadius: "50%", background: "radial-gradient(closest-side, rgba(255,255,255,0.45), transparent)", left: 200 + Math.sin(f / 70) * 260, top: -300 + Math.cos(f / 90) * 120 }} />
      <div style={{ position: "absolute", width: 1000, height: 1000, borderRadius: "50%", background: "radial-gradient(closest-side, rgba(90,102,199,0.16), transparent)", right: -200 + Math.cos(f / 80) * 240, bottom: -420 + Math.sin(f / 60) * 140 }} />

      {/* ── the world (camera) ── */}
      <AbsoluteFill style={{ perspective: 2200, scale: String(cam), rotate: `${Math.sin(f / 90) * 0.6}deg` }}>
        <AbsoluteFill style={{ transformStyle: "preserve-3d" }}>
          {/* upload: the manuscript flies into the phone */}
          {f > B.upload - 4 && f < B.upload + 32 ? (
            <At
              x={kf(f, [B.upload - 4, B.upload + 28], [1100, -430], inOut)}
              y={kf(f, [B.upload - 4, B.upload + 28], [-340, -20], inOut)}
              z={kf(f, [B.upload - 4, B.upload + 28], [200, -40])}
              style={{ rotate: `${kf(f, [B.upload - 4, B.upload + 28], [28, -4])}deg`, scale: String(kf(f, [B.upload + 10, B.upload + 30], [1, 0.25])), opacity: kf(f, [B.upload + 24, B.upload + 30], [1, 0]) }}
            >
              <div style={{ width: 300, height: 400, borderRadius: 22, background: "#fff", padding: 30, boxShadow: "0 30px 60px rgba(52,57,150,0.2)" }}>
                <Icon name="doc" size={44} color={C.dusk} />
                <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 26, color: C.ink, margin: "14px 0 20px", lineHeight: 1.15 }}>A Queue System for Campus Registrars</div>
                {[90, 100, 76, 96, 64, 88, 70].map((w, i) => (
                  <div key={i} style={{ height: 11, width: `${w}%`, borderRadius: 6, background: C.sand, marginBottom: 14 }} />
                ))}
              </div>
            </At>
          ) : null}

          {/* upload: what it found bursts out of the screen */}
          {f > B.upload + 30 && f < B.panel + 30
            ? CHIPS.map((c, i) => {
                const p = pop(B.upload + 36 + i * 4, 13);
                const away = tAt(f, B.panel + i * 2, B.panel + 16 + i * 2, inOut);
                const x = -430 + (c.x + 430) * p + away * 1400;
                const tone = c.tone === "a" ? [C.amberTint, C.amberInk] : c.tone === "s" ? [C.sageTint, C.sageInk] : ["#fff", C.duskInk];
                return (
                  <At key={c.t} x={x} y={c.y * p + 120 + Math.sin(f / 15 + i) * 6} z={c.z * p}>
                    <div style={{ whiteSpace: "nowrap", fontFamily: F.body, fontWeight: 700, fontSize: 40, padding: "14px 30px", borderRadius: 999, background: tone[0], color: tone[1], scale: String(0.3 + 0.7 * p), boxShadow: "0 16px 30px rgba(52,57,150,0.12)" }}>{c.t}</div>
                  </At>
                );
              })
            : null}

          {/* panel: three panelists step out of the setup screen */}
          {f > B.panel + 14 && f < B.ask + 22
            ? CARDS.map((c, i) => {
                const p = pop(B.panel + 18 + i * 6, 13);
                const back = tAt(f, B.ask + i * 2, B.ask + 18 + i * 2, inOut);
                const santos = c.p === 1;
                const nursing = f >= COURSE_SWITCH;
                const flip = santos ? kf(f, [COURSE_SWITCH - 6, COURSE_SWITCH, COURSE_SWITCH + 8], [1, 0, 1]) : 1;
                const ox = 470 + (c.x - 470) * p;
                return (
                  <At key={c.p} x={ox + (0 - ox) * back} y={c.y * p * (1 - back) + Math.sin(f / 18 + i * 2) * 8} z={c.z * p}>
                    <div
                      style={{
                        width: 270,
                        padding: "34px 20px 28px",
                        borderRadius: 30,
                        background: santos ? C.paper : "#fff",
                        border: `4px solid ${santos ? C.dusk : "transparent"}`,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        boxShadow: "0 24px 50px rgba(52,57,150,0.15)",
                        scale: `${(0.2 + 0.8 * p) * (1 - back * 0.8) * flip} ${(0.2 + 0.8 * p) * (1 - back * 0.8)}`,
                        rotate: `${c.rot * p}deg`,
                        opacity: 1 - back,
                      }}
                    >
                      <Face persona={c.p} size={150} />
                      <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 32, color: C.ink, marginTop: 18, whiteSpace: "nowrap" }}>
                        {c.p === 0 ? "Dr. Reyes" : c.p === 2 ? "Prof. Cruz" : nursing ? "Dr. Santos" : "Engr. Santos"}
                      </div>
                      <div style={{ fontFamily: F.mono, fontSize: 20, letterSpacing: 2, color: santos ? C.duskInk : C.muted, marginTop: 6, textTransform: "uppercase" }}>
                        {c.p === 0 ? "Chair" : c.p === 2 ? "Methodology" : nursing ? "Clinical" : "Technical"}
                      </div>
                    </div>
                  </At>
                );
              })
            : null}

          {/* ask: the room fills with the panelist's voice */}
          {f > B.ask + 10 && f < B.flag + 16
            ? [0, 1, 2].map((r) => {
                const t = ((f + r * 16) % 48) / 48;
                return (
                  <At key={r} x={pose.x} y={pose.y} z={-60}>
                    <div style={{ width: 480, height: 980, borderRadius: 90, border: `3px solid ${C.duskSoft}`, scale: String(1 + t * 0.45), opacity: (1 - t) * 0.5 * kf(f, [B.ask + 10, B.ask + 20, B.flag, B.flag + 12], [0, 1, 1, 0]) }} />
                  </At>
                );
              })
            : null}

          {/* flag: an amber glow behind the phone as the contradiction lands */}
          {f > CATCH - 6 && f < B.report + 10 ? (
            <At x={pose.x} y={pose.y} z={-100}>
              <div style={{ width: 760, height: 760, borderRadius: "50%", background: `radial-gradient(closest-side, ${C.amber}88, transparent)`, scale: String(0.6 + 0.5 * pop(CATCH, 9)), opacity: kf(f, [CATCH - 6, CATCH + 4, B.report - 6, B.report + 10], [0, 1, 0.6, 0]) }} />
            </At>
          ) : null}

          <Phone pose={pose}>
            <Screen f={f} />
          </Phone>

          {/* ask: floating labels */}
          {f > B.ask + 30 && f < B.flag + 16 ? (
            <>
              <At x={470} y={-170} z={80}>
                <div style={{ fontFamily: F.mono, fontSize: 30, letterSpacing: 3, padding: "12px 26px", borderRadius: 999, background: C.duskTint, color: C.duskInk, scale: String(pop(B.ask + 30) * (1 - tAt(f, B.flag, B.flag + 12))), rotate: "-4deg" }}>TECHNICAL</div>
              </At>
              <At x={520} y={40} z={140}>
                <div style={{ fontFamily: F.mono, fontSize: 30, letterSpacing: 3, padding: "12px 26px", borderRadius: 999, background: C.amberTint, color: C.amberInk, scale: String(pop(B.ask + 48, 9) * (1 - tAt(f, B.flag, B.flag + 12))), rotate: "3deg" }}>FOLLOW-UP 1 OF 2</div>
              </At>
            </>
          ) : null}

          {/* flag: the catch flies out of the phone */}
          {f > CATCH && f < B.report + 20 ? (
            <At
              x={-400 + (380 + 400) * pop(CATCH + 2, 13) + tAt(f, B.report, B.report + 18, inOut) * 1400}
              y={90 - 10 * pop(CATCH + 2, 13)}
              z={120}
            >
              <div
                style={{
                  width: 700,
                  display: "flex",
                  gap: 24,
                  alignItems: "center",
                  padding: "30px 38px",
                  borderRadius: 32,
                  background: C.amberTint,
                  border: `4px solid ${C.amber}`,
                  boxShadow: "0 24px 60px rgba(108,67,2,0.18)",
                  scale: String(0.3 + 0.7 * pop(CATCH + 2, 13)),
                  rotate: `${(1 - pop(CATCH + 2, 13)) * -12}deg`,
                }}
              >
                <Icon name="warning" size={64} color={C.amberInk} />
                <div style={{ fontFamily: F.body, fontSize: 38, color: C.amberInk, lineHeight: 1.2 }}>
                  You said <b>40</b>.<br />Your paper says <b>30</b>.
                </div>
              </div>
            </At>
          ) : null}
        </AbsoluteFill>
      </AbsoluteFill>

      {/* ── type layer (flat, over the world) ── */}
      {/* hook */}
      {f < B.meet + 6 ? (
        <AbsoluteFill style={{ justifyContent: "center", padding: "0 200px" }}>
          <Reveal f={f} at={4} out={9999} color={C.paper} style={{ fontSize: 170 }}>
            Your defense
          </Reveal>
          <div style={{ display: "flex", alignItems: "baseline", gap: 40 }}>
            <Reveal f={f} at={16} out={9999} color={C.paper} style={{ fontSize: 170 }}>
              is in
            </Reveal>
            <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 230, color: C.amber, lineHeight: 0.9, scale: String(pop(22, 9) * zoom3), translate: `0 ${(1 - pop(22, 9)) * 80}px` }}>3</div>
            <Reveal f={f} at={28} out={B.meet - 14} color={C.paper} style={{ fontSize: 170 }}>
              days.
            </Reveal>
          </div>
        </AbsoluteFill>
      ) : null}
      {f >= B.meet + 2 && f < B.meet + 22 ? (
        <AbsoluteFill style={{ background: `radial-gradient(circle at 660px 540px, transparent ${circle * 1600}px, ${C.amber} ${circle * 1600 + 1}px)` }} />
      ) : null}

      {/* meet: owl + wordmark */}
      {owlOn && f >= B.meet ? (
        <AbsoluteFill style={{ perspective: 2200 }}>
          <At
            x={interpolate(owlFly, [0, 1], [-420, -430])}
            y={interpolate(owlFly, [0, 1], [0, -70])}
            style={{ scale: String(owlIn * interpolate(owlFly, [0, 1], [1, 0.46])), rotate: `${Math.sin(f / 5) * 5 * (1 - owlFly)}deg` }}
          >
            <Owl mood="waving" size={460} />
          </At>
          <At x={400} y={-10}>
            <div style={{ display: "flex", fontFamily: F.display, fontWeight: 800, fontSize: 250, letterSpacing: -6, lineHeight: 0.9 }}>
              {"DEEMO".split("").map((l, i) => {
                const p = pop(B.meet + 14 + i * 3, 11);
                const out = tAt(f, B.meet + 40 + i * 2, B.meet + 54 + i * 2, inOut);
                return (
                  <span key={i} style={{ display: "inline-block", color: i ? C.ink : C.dusk, scale: String(p), translate: `0 ${(1 - p) * 120 - out * 500}px`, opacity: 1 - out }}>
                    {l}
                  </span>
                );
              })}
            </div>
            <Reveal f={f} at={B.meet + 26} out={B.meet + 44} color={C.inkMuted} style={{ fontFamily: F.body, fontWeight: 500, fontSize: 56, marginTop: 10 }}>
              your AI mock panel
            </Reveal>
          </At>
        </AbsoluteFill>
      ) : null}

      {/* upload */}
      <At x={360} y={-250}>
        <Reveal f={f} at={B.upload + 8} out={B.panel - 6} style={{ fontSize: 120, width: 900 }}>
          Reads every page.
        </Reveal>
      </At>

      {/* panel */}
      <At x={-310} y={-310}>
        <Reveal f={f} at={B.panel + 12} out={B.ask - 4} style={{ fontSize: 110, width: 1180 }}>
          Built for your field.
        </Reveal>
      </At>
      {f > B.panel + 20 && f < B.ask + 10 ? (
        <At x={-610} y={-185}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              fontFamily: F.body,
              fontWeight: 700,
              fontSize: 36,
              padding: "12px 32px",
              borderRadius: 999,
              background: C.ink,
              color: C.paper,
              whiteSpace: "nowrap",
              scale: String(pop(B.panel + 22) * kf(f, [COURSE_SWITCH - 6, COURSE_SWITCH, COURSE_SWITCH + 10], [1, 0.88, 1]) * (1 - tAt(f, B.ask - 4, B.ask + 8))),
            }}
          >
            <span style={{ fontFamily: F.mono, fontSize: 22, color: C.faint, letterSpacing: 3 }}>COURSE</span>
            {f >= COURSE_SWITCH ? "Nursing & Health" : "BSIT · Capstone"}
          </div>
        </At>
      ) : null}

      {/* ask */}
      <At x={-600} y={-20}>
        <Reveal f={f} at={B.ask + 16} out={B.flag - 4} color={C.paper} style={{ fontSize: 120, width: 560 }}>
          Asked out loud.
        </Reveal>
      </At>

      {/* flag */}
      <At x={380} y={-170}>
        <Reveal f={f} at={B.flag + 10} out={B.report - 4} style={{ fontSize: 96, width: 760 }}>
          Contradict your paper?
        </Reveal>
      </At>

      {/* report: the score, big, beside the spinning phone */}
      {f > B.report + 8 && f < B.cta + 16 ? (
        <At x={-330} y={0}>
          <div style={{ width: 860, color: C.paper, opacity: 1 - tAt(f, B.cta, B.cta + 14), translate: `${-tAt(f, B.cta, B.cta + 14, inOut) * 300}px 0` }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 24 }}>
              <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 260, lineHeight: 0.85, scale: String(pop(B.report + 10, 11)), transformOrigin: "left bottom" }}>
                {Math.round(kf(f, [B.report + 14, B.report + 56], [0, 82], easeOut))}
              </div>
              <div style={{ fontFamily: F.mono, fontSize: 32, letterSpacing: 4, color: C.duskTint, opacity: tAt(f, B.report + 18, B.report + 30) }}>READINESS</div>
            </div>
            {RUBRIC.map((r, i) => {
              const t = tAt(f, B.report + 22 + i * 5, B.report + 50 + i * 5);
              return (
                <div key={r} style={{ marginTop: 22, opacity: Math.min(1, t * 3), translate: `${(1 - t) * -60}px 0` }}>
                  <div style={{ fontFamily: F.body, fontWeight: 500, fontSize: 30, marginBottom: 8 }}>{r}</div>
                  <div style={{ height: 14, borderRadius: 7, background: "rgba(255,255,255,0.2)" }}>
                    <div style={{ width: `${LEVELS[i]! * t * 100}%`, height: "100%", borderRadius: 7, background: i === 3 ? C.amber : C.paper }} />
                  </div>
                </div>
              );
            })}
          </div>
        </At>
      ) : null}

      {/* cta: the owl comes out of the screen as the phone falls away */}
      {f > B.cta + 8 ? (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <Owl mood="cheering" size={330} style={{ scale: String(pop(B.cta + 10, 9)), translate: `0 ${(1 - pop(B.cta + 10, 9)) * 200 + Math.sin(f / 8) * 8}px` }} />
          <div style={{ display: "flex", fontFamily: F.display, fontWeight: 800, fontSize: 200, letterSpacing: -5, lineHeight: 0.9, marginTop: 6 }}>
            {"DEEMO".split("").map((l, i) => {
              const p = pop(B.cta + 16 + i * 3, 11);
              return (
                <span key={i} style={{ display: "inline-block", color: i ? C.ink : C.dusk, scale: String(p), translate: `0 ${(1 - p) * 100}px` }}>
                  {l}
                </span>
              );
            })}
          </div>
          <Reveal f={f} at={B.cta + 34} out={9999} color={C.dusk} style={{ fontWeight: 700, fontSize: 64, marginTop: 22, textAlign: "center" }}>
            Practice the defense, before the defense.
          </Reveal>
          <div style={{ fontFamily: F.mono, fontSize: 28, letterSpacing: 4, color: C.muted, marginTop: 36, opacity: tAt(f, B.cta + 60, B.cta + 76) }}>
            ANDROID · FREE TO START · ANY COURSE
          </div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};

