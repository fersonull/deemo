// What the phone's screen shows: Setup (whose controls fly in from outside and dock into their slots), the live
// session, and the readiness report. Drawn after the real app's screens, in its tokens.
import type React from "react";
import { blinkAt, PanelFace } from "./components/panel-face";
import { SCREEN_W } from "./components/phone";
import { curve, ios, kf, lerp, speedBlur, t } from "./motion";
import { Deemo } from "./components/deemo";
import { BLOB, C, F, Icon } from "./ui";

const PAD = 20;
const W = SCREEN_W - PAD * 2;

const StatusBar: React.FC<{ dark?: boolean }> = ({ dark }) => (
  <div
    style={{
      position: "absolute",
      top: 18,
      left: 30,
      right: 30,
      display: "flex",
      justifyContent: "space-between",
      fontFamily: F.body,
      fontWeight: 600,
      fontSize: 16,
      color: dark ? C.paper : C.ink,
    }}
  >
    <span>9:41</span>
    <span style={{ letterSpacing: 2 }}>●●● ▮</span>
  </div>
);

const Label: React.FC<{ y: number; children: string }> = ({ y, children }) => (
  <div style={{ position: "absolute", left: PAD, top: y, fontFamily: F.mono, fontSize: 12, letterSpacing: 2, color: C.muted }}>{children}</div>
);

const Segmented: React.FC<{ items: string[]; on: number }> = ({ items, on }) => (
  <div style={{ display: "flex", height: "100%", padding: 4, gap: 4, borderRadius: 16, background: C.sand, boxShadow: `0 3px 0 ${C.sandDepth}` }}>
    {items.map((it, i) => (
      <div
        key={it}
        style={{
          flex: 1,
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: F.body,
          fontWeight: i === on ? 700 : 500,
          fontSize: 15,
          color: i === on ? C.paper : C.inkMuted,
          background: i === on ? C.dusk : "transparent",
          boxShadow: i === on ? `0 3px 0 ${C.duskInk}` : "none",
        }}
      >
        {it}
      </div>
    ))}
  </div>
);

// The Setup controls, each with its docked slot on the screen and where it starts its flight (screen coordinates,
// far to the left of the phone), in the order they land.
type Control = { y: number; h: number; from: [number, number]; render: () => React.ReactNode };
export const CONTROLS: Control[] = [
  { y: 178, h: 48, from: [-980, -60], render: () => <Segmented items={["Title", "Pre-Oral", "Final"]} on={1} /> },
  {
    y: 270,
    h: 66,
    from: [-1180, 160],
    render: () => (
      <div style={{ display: "flex", gap: 10, height: "100%" }}>
        {[0, 1, 2].map((p) => (
          <div
            key={p}
            style={{
              flex: 1,
              borderRadius: 18,
              background: C.duskTint,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `inset 0 0 0 2px ${C.dusk}, 0 3px 0 ${C.duskInk}`,
            }}
          >
            <PanelFace persona={p} size={46} />
          </div>
        ))}
      </div>
    ),
  },
  { y: 384, h: 48, from: [-900, 300], render: () => <Segmented items={["None", "1", "2", "3"]} on={2} /> },
  { y: 478, h: 48, from: [-1260, 420], render: () => <Segmented items={["Easy", "Standard", "Hard"]} on={1} /> },
  {
    y: 548,
    h: 64,
    from: [-1040, 560],
    render: () => (
      <div
        style={{
          height: "100%",
          borderRadius: 18,
          background: "#FFFCF7",
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "0 14px",
          boxShadow: `0 3px 0 ${C.sandDepth}`,
        }}
      >
        <Icon name="doc" size={26} color={C.dusk} />
        <div style={{ flex: 1, fontFamily: F.body, fontSize: 15, fontWeight: 600, color: C.ink }}>ReqTrack.pdf</div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: F.body, fontSize: 13, color: C.sageInk, fontWeight: 700 }}>
          <Icon name="check" size={16} color={C.sageInk} /> Read
        </div>
      </div>
    ),
  },
  {
    y: 666,
    h: 60,
    from: [-860, 760],
    render: () => (
      <div
        style={{
          height: "100%",
          borderRadius: 30,
          background: C.ink,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          fontFamily: F.body,
          fontWeight: 700,
          fontSize: 18,
          color: C.paper,
          boxShadow: `0 5px 0 ${C.inkDepth}`,
        }}
      >
        <Icon name="mic" size={22} color={C.paper} /> Start defense
      </div>
    ),
  },
];
export const CONTROL_AT = (i: number) => 24 + i * 10; // landing starts, frames into the setup scene

export const SetupScreen: React.FC = () => (
  <div style={{ position: "absolute", inset: 0, background: C.paper }}>
    <StatusBar />
    <div style={{ position: "absolute", left: PAD, top: 68, fontFamily: F.display, fontWeight: 700, fontSize: 30, color: C.ink, letterSpacing: -0.5 }}>
      New session
    </div>
    <div style={{ position: "absolute", left: PAD, top: 110, fontFamily: F.body, fontSize: 15, color: C.muted }}>ReqTrack · BSIT</div>
    <Label y={156}>STAGE</Label>
    <Label y={248}>PANEL</Label>
    <Label y={362}>FOLLOW-UPS</Label>
    <Label y={456}>DIFFICULTY</Label>
    {/* empty slots, so the controls have somewhere to land */}
    {CONTROLS.map((c, i) => (
      <div key={i} style={{ position: "absolute", left: PAD, top: c.y, width: W, height: c.h, borderRadius: 16, border: `1.5px dashed ${C.sandDepth}` }} />
    ))}
  </div>
);

// The controls in flight: each springs along a curve from far left onto its slot, smeared while fast.
export const SetupFlights: React.FC<{ f: number }> = ({ f }) => (
  <>
    {CONTROLS.map((c, i) => {
      const at = CONTROL_AT(i);
      const pos = (fr: number) => {
        const p = ios(fr, at, 150);
        const [x, y] = curve(p, c.from, [c.from[0] * 0.35, c.from[1] - 260], [0, 0]);
        return [x, y, p];
      };
      const [x, y, p] = pos(f) as [number, number, number];
      const flying = 1 - t(f, at + 16, at + 40);
      return (
        <div
          key={i}
          style={{
            position: "absolute",
            left: PAD,
            top: c.y,
            width: W,
            height: c.h,
            opacity: t(f, at - 6, at + 4),
            transform: `translate(${x}px, ${y}px) scale(${lerp(p, 1.25, 1)}) rotate(${(1 - p) * -10}deg)`,
            filter: `blur(${speedBlur((fr) => pos(fr).slice(0, 2), f, 0.05, 10)}px) drop-shadow(0 ${30 * flying}px ${36 * flying}px rgba(42,36,32,${0.35 * flying}))`,
          }}
        >
          {c.render()}
        </div>
      );
    })}
  </>
);

// Live session, laid out like the app's session screen (screens/session): stage pill and End, the panel row, the
// question card, the transcript, and pause · mic blob · keyboard. As in the app, nothing on screen marks a
// contradiction: the panelist challenges it out loud with a clarificatory question. `f` is frames into the scene.
export const LIVE = { ask: 24, answer: 70, flag: 120, score: 200 };

const SEATS = [
  { persona: 0, name: "Dr. Reyes", role: "Chair" },
  { persona: 1, name: "Engr. Santos", role: "Technical" },
  { persona: 2, name: "Prof. Cruz", role: "Methodology" },
];
const ASKER = 2;

const Chip: React.FC<{ icon: "help" | "science"; tint?: boolean; children: string }> = ({ icon, tint, children }) => (
  <div
    style={{
      height: 26,
      borderRadius: 13,
      padding: "0 10px",
      display: "flex",
      alignItems: "center",
      gap: 5,
      background: tint ? C.duskTint : C.paper,
      fontFamily: F.body,
      fontWeight: 600,
      fontSize: 11.5,
      color: tint ? C.duskInk : C.ink,
    }}
  >
    <Icon name={icon} size={14} color={tint ? C.duskInk : C.ink} />
    {children}
  </div>
);

const Round: React.FC<{ icon: "pause" | "keyboard" }> = ({ icon }) => (
  <div style={{ width: 56, height: 56, borderRadius: 28, background: C.sand, display: "flex", alignItems: "center", justifyContent: "center" }}>
    <Icon name={icon} size={24} color={C.ink} />
  </div>
);

export const LiveScreen: React.FC<{ f: number }> = ({ f }) => {
  const answering = f >= LIVE.answer && f < LIVE.flag;
  const challenge = f >= LIVE.flag;
  const thinking = f >= LIVE.flag - 14 && f < LIVE.flag + 6;
  const speaking = !answering && !thinking;
  const qIn = ios(f, challenge ? LIVE.flag + 6 : LIVE.ask, 200);
  const pulse = (Math.sin(f / 11) + 1) / 2;
  const elapsed = 488 + Math.floor(f / 60);
  const answerSecs = Math.max(0, Math.floor((f - LIVE.answer) / 60));
  const all: { who: number | "you"; text: string; at: number }[] = [
    { who: 0, text: "Thank you. Let's start with your methodology.", at: -999 },
    { who: ASKER, text: "How did you choose your respondents, and why that many?", at: LIVE.ask },
    { who: "you", text: "We surveyed 45 registrar staff and students…", at: LIVE.answer + 10 },
  ];
  const lines = all.filter((l) => f >= l.at);

  return (
    <div style={{ position: "absolute", inset: 0, background: C.paper, display: "flex", flexDirection: "column", paddingTop: 52 }}>
      {/* top: stage + time, End */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px 0 18px" }}>
        <div style={{ height: 36, borderRadius: 18, background: C.sand, display: "flex", alignItems: "center", gap: 8, padding: "0 14px" }}>
          <span style={{ fontFamily: F.body, fontWeight: 600, fontSize: 13, color: C.ink }}>Pre-Oral</span>
          <span style={{ fontFamily: F.mono, fontSize: 13, color: C.inkMuted }}>
            {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
          </span>
        </div>
        <div style={{ height: 44, padding: "0 18px", borderRadius: 22, background: C.sand, display: "flex", alignItems: "center", fontFamily: F.body, fontWeight: 600, fontSize: 13, color: C.ink }}>
          End
        </div>
      </div>

      {/* the panel */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 6, paddingTop: 22 }}>
        {SEATS.map((p, i) => {
          const asker = i === ASKER;
          const status = asker ? (thinking ? "Thinking…" : speaking ? "Speaking" : "Listening") : "Listening";
          const size = asker && speaking ? 72 : 64;
          return (
            <div key={i} style={{ width: 104, display: "flex", flexDirection: "column", alignItems: "center", gap: 7 }}>
              <div style={{ position: "relative", width: size, height: size }}>
                {asker && speaking ? (
                  <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: C.duskTint, transform: `scale(${1.08 + 0.08 * pulse})`, opacity: 0.7 - 0.35 * pulse }} />
                ) : null}
                <PanelFace
                  persona={p.persona}
                  size={size}
                  lid={blinkAt(f, i)}
                  speak={asker && speaking ? Math.abs(Math.sin(f / 4)) * 0.8 : 0}
                  skeptical={asker && challenge ? ios(f, LIVE.flag - 14) : 0}
                  style={{ position: "relative" }}
                />
                {asker && thinking ? (
                  <div style={{ position: "absolute", top: -10, right: -12, display: "flex", gap: 3, background: "#fff", borderRadius: 10, padding: "5px 7px", boxShadow: "0 2px 4px rgba(42,36,32,0.2)" }}>
                    {[0.3, 0.6, 1].map((o) => (
                      <div key={o} style={{ width: 4, height: 4, borderRadius: 2, background: C.ink, opacity: o }} />
                    ))}
                  </div>
                ) : null}
              </div>
              <div style={{ width: 100, fontFamily: F.body, fontWeight: 600, fontSize: 11, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textAlign: "center" }}>
                {p.name} · {p.role}
              </div>
              <div style={{ fontFamily: F.body, fontWeight: 500, fontSize: 10.5, color: status === "Speaking" ? "#4851B0" : C.muted, marginTop: -5 }}>{status}</div>
            </div>
          );
        })}
      </div>

      {/* question card */}
      <div
        style={{
          margin: "16px 14px 0",
          background: C.sand,
          borderRadius: 26,
          padding: "16px 18px 18px",
          opacity: qIn,
          transform: `translateY(${(1 - qIn) * 24}px)`,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
          <div style={{ display: "flex", gap: 6 }}>
            {challenge ? <Chip icon="help">Clarificatory</Chip> : <Chip icon="science">Methodological</Chip>}
          </div>
          <span style={{ fontFamily: F.mono, fontSize: 11, color: C.muted }}>Q4</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <PanelFace persona={2} size={22} />
          <span style={{ fontFamily: F.body, fontWeight: 600, fontSize: 12, color: C.inkMuted }}>Prof. Cruz · Methodology asks</span>
        </div>
        <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 21, lineHeight: "25px", letterSpacing: -0.3, color: C.ink }}>
          {challenge ? "You just said 45 respondents, but Chapter 3 says 30. Which is it?" : "How did you choose your respondents, and why that many?"}
        </div>
      </div>

      {/* transcript */}
      <div style={{ flex: 1, overflow: "hidden", padding: "18px 22px 0", display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 9, maskImage: "linear-gradient(transparent, #000 30%, #000 85%, transparent)" }}>
        {lines.map((l, i) => {
          const p = ios(f, l.at, 200);
          const who = l.who === "you" ? null : SEATS[l.who]!;
          return (
            <div key={i} style={{ display: "flex", gap: 8, opacity: Math.min(1, p * 1.4), transform: `translateY(${(1 - p) * 12}px)` }}>
              {who ? <PanelFace persona={who.persona} size={20} /> : null}
              <div style={{ flex: 1, fontFamily: F.body, fontSize: 13.5, lineHeight: "19.5px", color: C.inkMuted }}>
                <b style={{ color: C.ink, fontWeight: 600 }}>{who ? who.name : "You"}</b>
                {"  "}
                {l.text}
              </div>
            </div>
          );
        })}
      </div>

      {/* bottom: pause · mic · keyboard */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 18px 22px" }}>
        <Round icon="pause" />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div style={{ position: "relative", width: 96, height: 84, opacity: answering ? 1 : 0.4 }}>
            {answering ? <div style={{ position: "absolute", inset: 0, borderRadius: BLOB, background: C.duskTint, transform: `scale(${1.12 + pulse * 0.16})`, opacity: 0.5 }} /> : null}
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: BLOB,
                background: C.dusk,
                boxShadow: answering ? `1px 4px 0 ${C.duskInk}` : "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
              }}
            >
              {answering
                ? [0.5, 0.8, 1, 0.7, 0.45].map((k, i) => (
                    <div key={i} style={{ width: 5, borderRadius: 3, background: C.paper, height: 8 + Math.abs(Math.sin(f / 4 + i)) * 24 * k }} />
                  ))
                : <Icon name="mic" size={32} color={C.paper} />}
            </div>
          </div>
          <div style={{ fontFamily: F.mono, fontSize: 12, color: C.inkMuted, height: 16 }}>
            {answering ? `0:${String(answerSecs).padStart(2, "0")} · tap when done` : thinking ? "…" : "panel speaking"}
          </div>
        </div>
        <Round icon="keyboard" />
      </div>
    </div>
  );
};

// The report, laid out like the app's results screen (screens/results): close + header, the big score with its
// band, Deemo's note, the stats row, then the rubric card. Criteria are the default rubric (server scoring.ts).
const CRITERIA: [string, number, number][] = [
  ["Content Mastery", 5, 25],
  ["Reasoning & Justification", 4, 20],
  ["Clarity & Organization", 4, 20],
  ["Consistency with Manuscript", 3, 20],
  ["Confidence & Delivery", 4, 15],
];

export const ScoreScreen: React.FC<{ f: number }> = ({ f }) => {
  const score = Math.round(kf(f, [4, 60], [0, 78]));
  const detail = ios(f, 18, 180);
  return (
    <div style={{ position: "absolute", inset: 0, background: C.paper, paddingTop: 46 }}>
      <div style={{ height: 52, display: "flex", alignItems: "center", gap: 4, padding: "0 10px" }}>
        <div style={{ width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="close" size={24} color={C.ink} />
        </div>
        <span style={{ fontFamily: F.body, fontWeight: 500, fontSize: 13, color: C.inkMuted }}>Pre-Oral · Oct 21</span>
      </div>
      <div style={{ padding: "0 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 4 }}>
          <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 88, lineHeight: "92px", letterSpacing: -4, color: C.ink, fontVariantNumeric: "tabular-nums" }}>
            {score}
            <span style={{ fontSize: 40, letterSpacing: -1 }}>%</span>
          </div>
          <div>
            <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 26, lineHeight: "27px", letterSpacing: -0.8, color: C.duskInk }}>
              Nearly
              <br />
              ready.
            </div>
            <div style={{ display: "inline-block", marginTop: 6, borderRadius: 10, padding: "2px 8px", background: C.duskTint, fontFamily: F.body, fontWeight: 600, fontSize: 11.5, color: C.duskInk }}>
              Readiness 70–84%
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12, opacity: detail, transform: `translateY(${(1 - detail) * 16}px)` }}>
          <Deemo size={40} mood="cheering" />
          <div style={{ flex: 1, background: C.sand, borderRadius: 18, padding: "12px 14px", fontFamily: F.body, fontSize: 14, lineHeight: "20px", color: C.inkSoft }}>
            Strong on content. Settle your sample size before the real panel.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 16, opacity: detail }}>
          {[
            ["18:42", "length"],
            ["8/8", "topics answered"],
            ["1", "contradiction"],
          ].map(([v, l]) => (
            <div key={l} style={{ flex: 1, background: C.sand, borderRadius: 18, padding: "12px 12px" }}>
              <div style={{ fontFamily: F.mono, fontSize: 18, color: C.ink }}>{v}</div>
              <div style={{ fontFamily: F.body, fontSize: 11, color: C.muted, marginTop: 2, whiteSpace: "nowrap" }}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: 1.2, color: C.muted, marginTop: 24, marginBottom: 8 }}>RUBRIC</div>
        <div style={{ background: C.sand, borderRadius: 22, padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          {CRITERIA.map(([name, level, weight], i) => {
            const b = ios(f, 28 + i * 6, 170);
            return (
              <div key={name} style={{ opacity: Math.min(1, b * 1.4) }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ flex: 1, fontFamily: F.body, fontWeight: 600, fontSize: 13.5, color: C.ink }}>{name}</span>
                  <span style={{ fontFamily: F.mono, fontSize: 12, color: C.inkMuted }}>
                    {level}/5 · {weight}%
                  </span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: C.paper, marginTop: 6, overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 3, background: C.dusk, width: `${((level - 1) / 4) * 100 * b}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
