// Use case: panel. "Tailor a panel that fits your [course] course": the course rolls through a slot, and the middle
// panelist (the field expert) changes title, role and focus with it. Lineup data is the site's port of the real
// app logic, so what's shown is what the app does.
import type React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { COURSE_FOCUS, panelFor, type Course } from "../../../web/site/src/panel-data";
import { blinkAt, PanelFace } from "../components/panel-face";
import { ios, lerp, speedBlur, t } from "../motion";
import { C, F, surface, Words } from "../ui";

const ROLL: Course[] = ["BSIT", "Nursing & Health", "Maritime"];
const SLOT_H = 120;
const FONT = 100;
// The pill hugs the current word: an estimate of each course's width at FONT.
const width = (c: Course) => c.length * FONT * 0.55 + 80;
// When the slot rolls to course i+1, frames into the scene (Promo cues the roll sound off this too).
export const ROLLS = ROLL.length - 1;
export const rollAt = (len: number, i: number) => 54 + i * Math.floor((len - 110) / ROLLS);

export const Panel: React.FC<{ len: number }> = ({ len }) => {
  const f = useCurrentFrame();
  const pos = (fr: number) => ROLL.slice(1).reduce((sum, _, i) => sum + ios(fr, rollAt(len, i), 180), 0);
  const p = pos(f);
  const idx = Math.min(ROLL.length - 1, Math.round(p));
  const blur = speedBlur((fr) => [pos(fr) * SLOT_H], f, 0.35, 14);
  const lo = Math.floor(p);
  const w = lerp(p - lo, width(ROLL[lo]!), width(ROLL[Math.min(ROLL.length - 1, lo + 1)]!));
  const course = ROLL[idx]!;
  const seats = panelFor(course, 3);
  const swapAt = idx === 0 ? -100 : rollAt(len, idx - 1); // when the middle card last changed
  const swap = ios(f, swapAt + 4, 200);
  const head: React.CSSProperties = { justifyContent: "center", fontFamily: F.display, fontWeight: 800, fontSize: FONT, letterSpacing: -4, color: C.ink, lineHeight: 1 };

  return (
    <AbsoluteFill style={{ alignItems: "center", perspective: 1600 }}>
      <div style={{ marginTop: 140 }}>
        <Words text="Tailor a panel that fits your" at={10} stagger={3} style={head} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 26, marginTop: 24, opacity: ios(f, 26), transform: `translateY(${(1 - ios(f, 26)) * 40}px)` }}>
        <div style={{ ...surface("dusk", 36, 8), width: w, height: SLOT_H + 20, overflow: "hidden", position: "relative" }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 10 - p * SLOT_H, filter: `blur(${blur}px)` }}>
            {ROLL.map((c) => (
              <div key={c} style={{ height: SLOT_H, display: "flex", alignItems: "center", justifyContent: "center", ...head, color: C.paper, whiteSpace: "nowrap" }}>
                {c}
              </div>
            ))}
          </div>
        </div>
        <div style={head}>course</div>
      </div>
      <div style={{ display: "flex", gap: 40, marginTop: 90, alignItems: "flex-start" }}>
        {seats.map((s, i) => {
          const inP = ios(f, 30 + i * 6, 180);
          const mid = i === 1;
          return (
            <div
              key={i}
              style={{
                ...surface(mid ? "paper" : "sand", 30, mid ? 8 : 6),
                width: mid ? 440 : 330,
                padding: "30px 30px 28px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                opacity: inP,
                transform: `translateY(${(1 - inP) * 80 + (mid ? -18 : 0)}px) rotateY(${(i - 1) * -10}deg)`,
                outline: mid ? `3px solid ${C.dusk}` : undefined,
              }}
            >
              <PanelFace persona={s.persona} size={mid ? 128 : 104} lid={blinkAt(f, i)} speak={mid && f > swapAt + 6 && f < swapAt + 40 ? Math.abs(Math.sin(f / 4)) * 0.6 : 0} />
              <div
                style={{
                  marginTop: 18,
                  textAlign: "center",
                  opacity: mid ? swap : 1,
                  transform: mid ? `rotateX(${(1 - swap) * 70}deg)` : undefined,
                  filter: mid ? `blur(${(1 - swap) * 8}px)` : undefined,
                }}
              >
                <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: mid ? 36 : 28, color: C.ink }}>{s.name}</div>
                <div style={{ fontFamily: F.mono, fontSize: 18, letterSpacing: 2, color: mid ? C.dusk : C.muted, marginTop: 6, textTransform: "uppercase" }}>{s.role}</div>
                {mid ? (
                  <div style={{ fontFamily: F.body, fontSize: 20, lineHeight: 1.35, color: C.inkMuted, marginTop: 14, opacity: t(f, swapAt + 10, swapAt + 26) }}>
                    Presses on {COURSE_FOCUS[course].split(",").slice(0, 2).join(",")}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
