// The whole film: one backdrop, the scenes (each overlapping the next by OVERLAP frames, where the bridges
// happen), the persistent 3D phone that carries Meet → Improve from side to side, and the sound. Timing hangs off
// S in script.ts.
import type React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { Backdrop } from "./components/backdrop";
import { Phone, type Pose } from "./components/phone";
import { ease, ios, kf, lerp, speedBlur, t } from "./motion";
import { Cta } from "./scenes/cta";
import { Hook, HOOK_Q } from "./scenes/hook";
import { makeStep, phoneX } from "./scenes/step";
import { HomeScreen, LIVE, LiveScreen, ScoreScreen, UPLOAD_READ, UploadScreen } from "./screens";
import { LEN, ORDER, S, type Line } from "./script";
import { Music, Sfx, Voice } from "./ui";

const SCENES: Record<Line, React.FC<{ len: number }>> = {
  hook: Hook,
  meet: makeStep("meet"),
  upload: makeStep("upload"),
  defend: makeStep("defend"),
  improve: makeStep("improve"),
  cta: Cta,
};

// Every scene softens in and out over its overlap; the bespoke bridges play on top of this.
const Shell: React.FC<{ len: number; first: boolean; last: boolean; children: React.ReactNode }> = ({ len, first, last, children }) => {
  const f = useCurrentFrame();
  const enter = first ? 1 : t(f, 0, 22);
  const exit = last ? 0 : t(f, len - 26, len);
  return <AbsoluteFill style={{ opacity: enter * (1 - exit), filter: `blur(${(1 - enter) * 10 + exit * 12}px)` }}>{children}</AbsoluteFill>;
};

const PHONE_SCENES: Line[] = ["meet", "upload", "defend", "improve"];
const MOVE_AT = (l: Line) => S[l] - 16; // the phone starts crossing a little before each step's words arrive

// The phone's path by global frame: swings in from the right for Meet, then crosses to the side opposite each
// step's words (tilting toward the centre), and sinks away into the CTA.
function pose(g: number): Pose {
  const e = ios(g, S.meet - 14, 120);
  let x = lerp(e, 1500, phoneX("meet"));
  let swing = 0;
  for (let i = 1; i < PHONE_SCENES.length; i++) {
    const l = PHONE_SCENES[i]!;
    const q = ios(g, MOVE_AT(l), 110);
    const d = phoneX(l) - phoneX(PHONE_SCENES[i - 1]!);
    x += q * d;
    swing += Math.sin(Math.min(1, q) * Math.PI) * Math.sign(d);
  }
  const c = t(g, S.cta - 26, S.cta + 30, ease);
  return {
    x,
    y: lerp(e, 140, 40) + c * 1300,
    z: 0,
    rx: 4 + c * 30,
    ry: -(x / 430) * 16 - (1 - e) * 30 + swing * 8,
    rz: (1 - e) * 10 - swing * 3,
    s: 1.1 * (1 - c * 0.2),
    o: g > S.meet - 20 && g < S.cta + 40 ? 1 : 0,
  };
}

const screen = (l: Line, g: number) => {
  if (l === "meet") return <HomeScreen />;
  if (l === "upload") return <UploadScreen f={g - S.upload - 10} />;
  if (l === "defend") return <LiveScreen f={g - S.defend} />;
  return <ScoreScreen f={g - S.improve} />;
};

const PhoneLayer: React.FC = () => {
  const g = useCurrentFrame();
  const p = pose(g);
  if (!p.o) return null;
  const blur = speedBlur((fr) => {
    const q = pose(fr);
    return [q.x, q.y];
  }, g, 0.03, 8);
  // The screen changes mid-crossing, while the phone is moving fastest: the old one fades over the new.
  const i = Math.max(0, PHONE_SCENES.findLastIndex((l) => g >= MOVE_AT(l)));
  const cur = PHONE_SCENES[i]!;
  const prev = i > 0 ? PHONE_SCENES[i - 1]! : null;
  const fade = prev ? 1 - t(g, MOVE_AT(cur) + 4, MOVE_AT(cur) + 18) : 0;
  return (
    <AbsoluteFill style={{ filter: `blur(${blur}px)` }}>
      <Phone pose={p}>
        {screen(cur, g)}
        {prev && fade > 0 ? <div style={{ position: "absolute", inset: 0, opacity: fade }}>{screen(prev, g)}</div> : null}
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
    s *= kf(g, [b, b + 15, b + 55], [1, 1.05, 1], ease);
  }
  return s;
}

const Camera: React.FC<{ depth?: number; over?: number; children: React.ReactNode }> = ({ depth = 1, over = 1, children }) => {
  const g = useCurrentFrame();
  const s = cameraScale(g);
  return <AbsoluteFill style={{ transform: `scale(${(1 + (s - 1) * depth) * over})` }}>{children}</AbsoluteFill>;
};

export const Promo: React.FC = () => {
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
      <Music />
      {order.map((l) => (
        <Voice key={l} line={l} />
      ))}
      <Sfx id="pop" at={S.hook + 6} />
      <Sfx id="glass" at={S.hook + HOOK_Q} volume={0.8} />
      <Sfx id="whoosh" at={S.meet - 20} />
      <Sfx id="sparkle" at={S.meet + 10} volume={0.7} />
      {PHONE_SCENES.slice(1).map((l) => (
        <Sfx key={l} id="whoosh" at={MOVE_AT(l) - 4} volume={0.8} />
      ))}
      <Sfx id="paper" at={S.upload + 6} volume={0.9} />
      <Sfx id="scan" at={S.upload + 16} volume={0.6} />
      <Sfx id="chime" at={S.upload + 10 + UPLOAD_READ} volume={0.8} />
      <Sfx id="chime" at={S.defend + LIVE.ask} volume={0.9} />
      <Sfx id="click" at={S.defend + LIVE.answer} volume={0.8} />
      <Sfx id="nudge" at={S.defend + LIVE.flag} />
      <Sfx id="riser" at={S.improve - 20} volume={0.7} />
      <Sfx id="ding" at={S.improve + 60} />
      <Sfx id="swell" at={S.cta - 24} />
      <Sfx id="sting" at={S.cta + 30} volume={1.2} />
      <Sfx id="sparkle" at={S.cta + 40} volume={0.8} />
    </AbsoluteFill>
  );
};
