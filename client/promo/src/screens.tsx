// What the phone's screen shows: Setup (whose controls fly in from outside and dock into their slots), the live
// session, and the readiness report. Drawn after the real app's screens, in its tokens.
import type React from "react";
import { blinkAt, PanelFace } from "./components/panel-face";
import { ios, kf } from "./motion";
import { Deemo } from "./components/deemo";
import { BLOB, C, F, Icon, lit } from "./ui";

const PAD = 20;

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

const Back: React.FC = () => (
  <div style={{ position: "absolute", left: PAD - 2, top: 54 }}>
    <Icon name="back" size={24} color={C.ink} />
  </div>
);

// Home (screens/home): greeting, Deemo's note on the last score, Start practice, Group readiness, the defense path
// and the tab bar with the raised mic.
const GROUP = [
  { persona: 0, name: "You", score: 56 },
  { persona: 1, name: "Casper", score: 65 },
  { persona: 2, name: "Ci-n", score: 48 },
];
const TABS = [["home", "Home"], ["folder", "Projects"], null, ["chart", "History"], ["person", "Profile"]] as const;
const DIM = "rgba(247,243,236,0.55)";

export const HomeScreen: React.FC = () => (
  <div style={{ position: "absolute", inset: 0, background: C.paper }}>
    <StatusBar />
    <div style={{ position: "absolute", left: PAD, top: 62, fontFamily: F.display, fontWeight: 800, fontSize: 31, lineHeight: "32px", letterSpacing: -0.9, color: C.ink }}>
      Evening,
      <br />
      Kimberly.
    </div>
    <div style={{ position: "absolute", right: PAD, top: 62, width: 46, height: 46, borderRadius: 23, background: C.duskTint, overflow: "hidden", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <PanelFace persona={0} size={42} />
    </div>
    <div style={{ position: "absolute", left: 10, top: 152 }}>
      <Deemo size={84} mood="idle" />
    </div>
    <div style={{ position: "absolute", left: 100, right: PAD, top: 140, background: C.sand, boxShadow: lit(), borderRadius: 20, padding: "12px 14px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontFamily: F.display, fontWeight: 800, fontSize: 30, letterSpacing: -1, color: C.amberInk }}>
          56<span style={{ fontSize: 16 }}>%</span>
        </span>
        <span style={{ fontFamily: F.body, fontWeight: 600, fontSize: 15, color: C.amberInk }}>Developing</span>
      </div>
      <div style={{ fontFamily: F.body, fontSize: 12.5, lineHeight: "17px", color: C.inkSoft, marginTop: 2 }}>
        Your last <b>Pre-Oral</b>, <b style={{ color: C.sageInk }}>up 40 points</b>. Next: settle your sample size.
      </div>
      <div style={{ fontFamily: F.body, fontWeight: 600, fontSize: 12, color: C.duskIcon, marginTop: 6 }}>See the report ›</div>
    </div>
    <div style={{ position: "absolute", left: PAD, right: PAD, top: 286, height: 58, borderRadius: 29, background: C.ink, boxShadow: lit(true), display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 8px 0 22px" }}>
      <span style={{ fontFamily: F.body, fontWeight: 700, fontSize: 16, color: C.paper }}>Start practice</span>
      <div style={{ width: 44, height: 44, borderRadius: 22, background: C.dusk, boxShadow: lit(true), display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon name="mic" size={22} color={C.paper} />
      </div>
    </div>
    <div style={{ position: "absolute", left: PAD, right: PAD, top: 362, background: C.sand, boxShadow: lit(), borderRadius: 22, padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Icon name="group" size={20} color={C.duskIcon} />
        <span style={{ flex: 1, fontFamily: F.display, fontWeight: 700, fontSize: 17, color: C.ink }}>Group readiness</span>
        <span style={{ fontFamily: F.body, fontWeight: 600, fontSize: 12, color: C.duskIcon }}>Settings ›</span>
      </div>
      <div style={{ fontFamily: F.body, fontSize: 10.5, letterSpacing: 0.3, color: C.inkMuted, marginTop: 4 }}>REQTRACK: ENROLLMENT REQUIREMENTS…</div>
      <div style={{ display: "flex", gap: 18, marginTop: 12 }}>
        {GROUP.map((g) => (
          <div key={g.name} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <div style={{ width: 44, height: 44, borderRadius: 22, background: C.duskTint, overflow: "hidden", display: "flex", alignItems: "flex-end", justifyContent: "center", boxShadow: `0 0 0 3px ${C.amber}` }}>
              <PanelFace persona={g.persona} size={40} />
            </div>
            <span style={{ fontFamily: F.body, fontWeight: 600, fontSize: 12, color: C.ink, marginTop: 4 }}>{g.name}</span>
            <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 13, color: C.amberInk }}>{g.score}%</span>
          </div>
        ))}
      </div>
    </div>
    <Label y={572}>DEFENSE PATH</Label>
    {[
      { n: "1", name: "Title Defense", sub: "Start here", on: true },
      { n: "2", name: "Pre-Oral", sub: "Developing", on: false },
    ].map((r, i) => (
      <div key={r.n} style={{ position: "absolute", left: PAD, right: PAD, top: 598 + i * 56, display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 30, height: 30, borderRadius: 15, border: `2px solid ${r.on ? C.dusk : C.sand}`, background: r.on ? "transparent" : C.sand, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.body, fontWeight: 600, fontSize: 13, color: r.on ? C.duskIcon : C.muted }}>
          {r.n}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: F.body, fontWeight: 600, fontSize: 15, color: r.on ? C.ink : C.muted }}>{r.name}</div>
          <div style={{ fontFamily: F.body, fontSize: 12, color: r.on ? C.duskIcon : C.faint }}>{r.sub}</div>
        </div>
      </div>
    ))}
    {/* tab bar with the raised mic */}
    <div style={{ position: "absolute", left: 12, right: 12, bottom: 14, height: 66, borderRadius: 33, background: C.ink, boxShadow: lit(true), display: "flex", alignItems: "center", justifyContent: "space-around", padding: "0 6px" }}>
      {TABS.map((tab, i) =>
        tab ? (
          <div key={i} style={{ width: 54, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <Icon name={tab[0]} size={22} color={i === 0 ? C.paper : DIM} />
            <span style={{ fontFamily: F.body, fontWeight: 600, fontSize: 10, color: i === 0 ? C.paper : DIM }}>{tab[1]}</span>
          </div>
        ) : (
          <div key={i} style={{ width: 64 }} />
        ),
      )}
    </div>
    <div style={{ position: "absolute", left: "50%", bottom: 40, width: 66, height: 66, marginLeft: -33, borderRadius: 33, background: C.dusk, boxShadow: `${lit(true)}, 0 0 0 6px ${C.paper}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Icon name="mic" size={28} color={C.paper} />
    </div>
  </div>
);

// Upload: the analysis screen (screens/analysis). Deemo checks the paper with a progress bar, then "Here's what we
// understood" rises in: the field, the title and the summary the panel will ask from. `f` is frames into the scene.
export const UPLOAD_READ = 150; // frames of "Checking your research" before the result

const Card: React.FC<{ kicker: string; action?: string; at: number; f: number; children: React.ReactNode }> = ({ kicker, action, at, f, children }) => {
  const p = ios(f, at, 190);
  return (
    <div style={{ background: C.sand, boxShadow: lit(), borderRadius: 22, padding: "14px 16px", opacity: Math.min(1, p * 1.4), transform: `translateY(${(1 - p) * 40}px)` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 24 }}>
        <span style={{ fontFamily: F.mono, fontSize: 10.5, letterSpacing: 1.6, color: C.muted }}>{kicker}</span>
        {action ? <span style={{ borderRadius: 12, background: "#FFFCF7", boxShadow: lit(), padding: "4px 11px", fontFamily: F.body, fontWeight: 600, fontSize: 12, color: C.ink }}>{action}</span> : null}
      </div>
      {children}
    </div>
  );
};

export const UploadScreen: React.FC<{ f: number }> = ({ f }) => {
  const done = ios(f, UPLOAD_READ, 170);
  const bar = kf(f, [8, UPLOAD_READ - 6], [0.06, 1]);
  return (
    <div style={{ position: "absolute", inset: 0, background: C.paper }}>
      <StatusBar />
      {/* checking */}
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 200, opacity: 1 - done, transform: `scale(${1 - done * 0.06})` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.sand, boxShadow: lit(), borderRadius: 999, padding: "8px 16px 8px 12px", fontFamily: F.body, fontWeight: 600, fontSize: 13, color: C.ink, marginBottom: 26 }}>
          <Icon name="doc" size={18} color={C.dusk} /> ReqTrack.pdf
        </div>
        <Deemo size={150} mood="reading" lid={blinkAt(f, 3)} />
        <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 22, color: C.ink, marginTop: 18 }}>Checking your research</div>
        <div style={{ fontFamily: F.body, fontSize: 13, color: C.inkMuted, marginTop: 6 }}>Looking at your methods, tech and objectives.</div>
        <div style={{ width: 200, height: 8, borderRadius: 4, background: C.sand, marginTop: 22, overflow: "hidden" }}>
          <div style={{ width: `${bar * 100}%`, height: "100%", borderRadius: 4, background: C.sage }} />
        </div>
      </div>
      {/* understood */}
      <div style={{ position: "absolute", inset: 0, opacity: done, transform: `translateY(${(1 - done) * 60}px)` }}>
        <Back />
        <div style={{ position: "absolute", left: PAD, top: 92, fontFamily: F.display, fontWeight: 800, fontSize: 30, lineHeight: "32px", letterSpacing: -0.9, color: C.ink }}>
          Here&apos;s what
          <br />
          we understood.
        </div>
        <div style={{ position: "absolute", left: PAD, right: PAD, top: 166, fontFamily: F.body, fontSize: 13, lineHeight: "18px", color: C.inkMuted }}>
          The panel asks questions from this. Fix anything that&apos;s off.
        </div>
        <div style={{ position: "absolute", left: PAD, right: PAD, top: 214, display: "flex", flexDirection: "column", gap: 10 }}>
          <Card kicker="FIELD" action="Change" at={UPLOAD_READ + 10} f={f}>
            <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 18, color: C.ink, marginTop: 4 }}>BSIT · Web/Mobile App</div>
            <div style={{ fontFamily: F.body, fontSize: 12, color: C.muted, marginTop: 3 }}>From your manuscript. The panel is set up for this field.</div>
          </Card>
          <Card kicker="TITLE" action="Edit" at={UPLOAD_READ + 18} f={f}>
            <div style={{ fontFamily: F.body, fontSize: 13.5, lineHeight: "19px", letterSpacing: 0.2, color: C.ink, marginTop: 4 }}>
              REQTRACK: ENROLLMENT REQUIREMENTS TRACKING FOR STUDENTS AND THE REGISTRAR
            </div>
          </Card>
          <Card kicker="SUMMARY" at={UPLOAD_READ + 26} f={f}>
            <div style={{ fontFamily: F.body, fontSize: 13, lineHeight: "18.5px", color: C.inkSoft, marginTop: 4 }}>
              Students see missing enrollment requirements on their phone, and the registrar updates them in real time.
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
              {["Agile (Scrum)", "30 respondents", "ISO/IEC 25010"].map((k) => (
                <span key={k} style={{ borderRadius: 10, background: C.duskTint, padding: "3px 9px", fontFamily: F.body, fontWeight: 600, fontSize: 11, color: C.duskInk }}>
                  {k}
                </span>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

// Live session, laid out like the app's session screen (screens/session): stage pill and End, the panel row, the
// question card, the transcript, and pause · mic blob · keyboard. As in the app, nothing on screen marks a
// contradiction: the panelist challenges it out loud with a clarificatory question. `f` is frames into the scene.
export const LIVE = { ask: 30, answer: 110, flag: 300 }; // in step with the Defend line

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
  <div style={{ width: 56, height: 56, borderRadius: 28, background: C.sand, boxShadow: lit(), display: "flex", alignItems: "center", justifyContent: "center" }}>
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
        <div style={{ height: 36, borderRadius: 18, background: C.sand, boxShadow: lit(), display: "flex", alignItems: "center", gap: 8, padding: "0 14px" }}>
          <span style={{ fontFamily: F.body, fontWeight: 600, fontSize: 13, color: C.ink }}>Pre-Oral</span>
          <span style={{ fontFamily: F.mono, fontSize: 13, color: C.inkMuted }}>
            {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
          </span>
        </div>
        <div style={{ height: 44, padding: "0 18px", borderRadius: 22, background: C.sand, boxShadow: lit(), display: "flex", alignItems: "center", fontFamily: F.body, fontWeight: 600, fontSize: 13, color: C.ink }}>
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
          background: C.sand, boxShadow: lit(),
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
// "Top 3 things to fix", the report's own headline section (screens/results), for the sample paper.
const FIXES = [
  "Give one number for your respondents and say why 30 is enough.",
  "Explain how the registrar's updates reach students in real time.",
  "Name the ISO/IEC 25010 characteristics you tested, and the weakest.",
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
          <div style={{ flex: 1, background: C.sand, boxShadow: lit(), borderRadius: 18, padding: "12px 14px", fontFamily: F.body, fontSize: 14, lineHeight: "20px", color: C.inkSoft }}>
            Strong on content. Settle your sample size before the real panel.
          </div>
        </div>
        <div style={{ fontFamily: F.mono, fontSize: 11, color: C.muted, marginTop: 8, opacity: detail }}>Rubric 82 × coverage 8/8 − consistency 4 = 78</div>
        <div style={{ display: "flex", gap: 8, marginTop: 16, opacity: detail }}>
          {[
            ["18:42", "length"],
            ["8/8", "topics answered"],
            ["1", "contradiction"],
          ].map(([v, l]) => (
            <div key={l} style={{ flex: 1, background: C.sand, boxShadow: lit(), borderRadius: 18, padding: "12px 12px" }}>
              <div style={{ fontFamily: F.mono, fontSize: 18, color: C.ink }}>{v}</div>
              <div style={{ fontFamily: F.body, fontSize: 11, color: C.muted, marginTop: 2, whiteSpace: "nowrap" }}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: 1.2, color: C.muted, marginTop: 24, marginBottom: 8 }}>TOP 3 THINGS TO FIX</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {FIXES.map((fix, i) => {
            const b = ios(f, 28 + i * 8, 170);
            return (
              <div
                key={fix}
                style={{
                  display: "flex",
                  gap: 12,
                  background: C.sand,
                  boxShadow: lit(),
                  borderRadius: 18,
                  padding: "12px 14px",
                  opacity: Math.min(1, b * 1.4),
                  transform: `translateY(${(1 - b) * 14}px)`,
                }}
              >
                <div style={{ width: 22, height: 22, borderRadius: 11, background: C.ink, boxShadow: lit(true), color: C.paper, fontFamily: F.body, fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1, fontFamily: F.body, fontSize: 13, lineHeight: "18px", color: C.ink }}>{fix}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
