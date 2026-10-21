// The whole film: one backdrop, the scenes (each overlapping the next by OVERLAP frames, where the bridges
// happen), the persistent 3D phone that carries Setup → Live, and the sound. Timing hangs off S in script.ts.
import { Audio } from "@remotion/media";
import type React from "react";
import { AbsoluteFill, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Backdrop } from "./components/backdrop";
import { Phone, type Pose } from "./components/phone";
import { ease, ios, kf, lerp, speedBlur, t } from "./motion";
import { Analysis } from "./scenes/analysis";
import { Cta } from "./scenes/cta";
import { Intro } from "./scenes/intro";
import { Live } from "./scenes/live";
import { Panel, rollAt, ROLLS } from "./scenes/panel";
import { Problem } from "./scenes/problem";
import { Setup } from "./scenes/setup";
import { CONTROL_AT, CONTROLS, LIVE, LiveScreen, ScoreScreen, SetupFlights, SetupScreen } from "./screens";
import { hasMusic, LEN, ORDER, S, TOTAL, type Line } from "./script";
import { Sfx, Voice } from "./ui";

const SCENES: Record<Line, React.FC<{ len: number }>> = {
  intro: Intro,
  problem: Problem,
  analysis: Analysis,
  setup: Setup,
  panel: Panel,
  live: Live,
  cta: Cta,
};

// Every scene softens in and out over its overlap; the bespoke bridges play on top of this.
const Shell: React.FC<{ len: number; first: boolean; last: boolean; children: React.ReactNode }> = ({ len, first, last, children }) => {
  const f = useCurrentFrame();
  const enter = first ? 1 : t(f, 0, 22);
  const exit = last ? 0 : t(f, len - 26, len);
  return <AbsoluteFill style={{ opacity: enter * (1 - exit), filter: `blur(${(1 - enter) * 10 + exit * 12}px)` }}>{children}</AbsoluteFill>;
};

// The phone's path through the film, by global frame: swings in from the right for Setup, spins off right for the
// panel scene, rises from below for Live, sinks away into the CTA.
function pose(g: number): Pose {
  if (g < S.live - 40) {
    const e = ios(g, S.setup - 26, 110);
    const q = t(g, S.panel - 8, S.panel + 34, ease);
    return {
      x: lerp(e, 1400, 440) + q * 1200,
      y: 20,
      z: 0,
      rx: 5,
      ry: lerp(e, -75, -20) - q * 55,
      rz: lerp(e, 12, 0) - q * 8,
      s: 1,
      o: g > S.setup - 30 && g < S.panel + 40 ? 1 : 0,
    };
  }
  const e = ios(g, S.live + 2, 100); // after the panel cards have gone
  const c = t(g, S.cta - 26, S.cta + 30, ease);
  return {
    x: -330,
    y: lerp(e, 1150, 20) + c * 1300,
    z: 0,
    rx: lerp(e, 38, 6) + c * 30,
    ry: lerp(e, 34, 16),
    rz: lerp(e, -6, 0),
    s: 0.98 * (1 - c * 0.2),
    o: g < S.cta + 40 ? 1 : 0,
  };
}

const PhoneLayer: React.FC = () => {
  const g = useCurrentFrame();
  const p = pose(g);
  if (!p.o) return null;
  const blur = speedBlur((fr) => {
    const q = pose(fr);
    return [q.x, q.y];
  }, g, 0.035, 8);
  const live = g >= S.live - 40;
  const lf = g - S.live;
  const score = t(lf, LIVE.score, LIVE.score + 20);
  return (
    <AbsoluteFill style={{ filter: `blur(${blur}px)` }}>
      <Phone pose={p} overlay={live ? null : <SetupFlights f={g - S.setup} />}>
        {live ? (
          <>
            <LiveScreen f={lf} />
            {score > 0 ? (
              <div style={{ position: "absolute", inset: 0, opacity: score, transform: `scale(${1.06 - 0.06 * score})` }}>
                <ScoreScreen f={lf - LIVE.score} />
              </div>
            ) : null}
          </>
        ) : (
          <SetupScreen />
        )}
      </Phone>
    </AbsoluteFill>
  );
};

// The camera only moves on scene changes: a short push through the crossfade (peaking mid-blend, while both scenes
// are soft), then a settle back to rest. Inside a scene it holds still.
function cameraScale(g: number) {
  let s = 1;
  for (const l of ORDER.slice(1)) {
    const b = S[l];
    s *= kf(g, [b, b + 15, b + 55], [1, 1.07, 1], ease);
  }
  return s;
}

const Camera: React.FC<{ depth?: number; over?: number; children: React.ReactNode }> = ({ depth = 1, over = 1, children }) => {
  const g = useCurrentFrame();
  const s = cameraScale(g);
  return (
    <AbsoluteFill style={{ transform: `scale(${(1 + (s - 1) * depth) * over})` }}>
      {children}
    </AbsoluteFill>
  );
};

export const Promo: React.FC = () => {
  const f = useCurrentFrame();
  const order = Object.keys(SCENES) as Line[];
  return (
    <AbsoluteFill style={{ background: "#F7F3EC" }}>
      <Camera depth={0.35} over={1.08}>
        <Backdrop />
      </Camera>
      <Camera>
      {order.map((l, i) => {
        const Scene = SCENES[l];
        return (
          <Sequence key={l} name={l} from={S[l]} durationInFrames={LEN[l]}>
            <Shell len={LEN[l]} first={i === 0} last={i === order.length - 1}>
              <Scene len={LEN[l]} />
            </Shell>
          </Sequence>
        );
      })}
      <PhoneLayer />
      </Camera>

      {/* ── sound ── */}
      {hasMusic ? <Audio name="Music" src={staticFile("audio/music.mp3")} loop volume={kf(f, [0, 20, TOTAL - 70, TOTAL - 1], [0, 0.2, 0.2, 0])} /> : null}
      {order.map((l) => (
        <Voice key={l} line={l} />
      ))}
      <Sfx id="pop" at={S.intro + 6} volume={0.4} />
      {[10, 15, 20].map((d) => (
        <Sfx key={d} id="glass" at={S.intro + d} volume={0.3} />
      ))}
      <Sfx id="whoosh" at={S.problem - 34} volume={0.45} />
      <Sfx id="hit" at={S.problem + 8} volume={0.3} />
      <Sfx id="whoosh" at={S.analysis - 50} volume={0.35} />
      <Sfx id="paper" at={S.analysis + 4} volume={0.4} />
      <Sfx id="scan" at={S.analysis + 14} volume={0.3} />
      <Sfx id="glass" at={S.analysis + 80} volume={0.35} />
      <Sfx id="glass" at={S.analysis + 140} volume={0.35} />
      <Sfx id="whoosh" at={S.setup - 40} volume={0.45} />
      {CONTROLS.map((_, i) => (
        <Sfx key={i} id="click" at={S.setup + CONTROL_AT(i) + 22} volume={0.35} />
      ))}
      <Sfx id="whoosh" at={S.panel - 10} volume={0.4} />
      {Array.from({ length: ROLLS }, (_, i) => (
        <Sfx key={i} id="roll" at={S.panel + rollAt(LEN.panel, i)} volume={0.3} />
      ))}
      <Sfx id="whoosh" at={S.live - 30} volume={0.4} />
      <Sfx id="chime" at={S.live + LIVE.ask} volume={0.35} />
      <Sfx id="nudge" at={S.live + LIVE.flag} volume={0.5} />
      <Sfx id="riser" at={S.live + LIVE.score - 30} volume={0.3} />
      <Sfx id="ding" at={S.live + LIVE.score + 62} volume={0.4} />
      <Sfx id="swell" at={S.cta - 24} volume={0.45} />
      <Sfx id="sparkle" at={S.cta + 40} volume={0.35} />
      <Sfx id="sting" at={S.cta + 30} volume={0.5} />
    </AbsoluteFill>
  );
};
