// Deemo, drawn in code: a frame-driven port of the app's owl (client/mobile/Deemo/src/components/deemo/index.tsx),
// same geometry and colours, with its moving parts as props so a scene can animate them per frame. Keep the shapes
// in step with the app.
import type React from "react";
import { C } from "../ui";

export type DeemoMood = "idle" | "cheering" | "reading";

const BODY = "M200 112 C292 112 322 170 318 232 C314 300 268 344 200 344 C132 344 86 300 82 232 C78 170 108 112 200 112 Z";
const FACE = "M200 170 C178 144 116 144 112 200 C108 250 160 268 200 248 C240 268 292 250 288 200 C284 144 222 144 200 170 Z";
const WING = {
  l: { d: "M96 236 C70 252 64 292 82 308 C100 300 112 278 112 254 Z", o: [102, 246], f: "M90 268 Q86 284 90 298" },
  r: { d: "M304 236 C330 252 336 292 318 308 C300 300 288 278 288 254 Z", o: [298, 246], f: "M310 268 Q314 284 310 298" },
} as const;
const EYES = [160, 240];
const EYE_Y = 204;
const EYE_R = 32;
const LINE = 6;
const ink = { stroke: C.duskInk, strokeLinecap: "round", strokeLinejoin: "round" } as const;
// The app's viewBox: the owl's footprint plus room for raised wings and sparks.
const VIEWBOX = "28 26 344 364";

type Props = {
  size: number; // width in px
  mood?: DeemoMood;
  lid?: number; // 1 open … 0 shut (blink)
  look?: [number, number]; // pupil offset, owl units
  wings?: [number, number]; // left/right wing angles (deg); defaults follow the mood
  spark?: number; // 0–1, the cheering sparks
  style?: React.CSSProperties;
};

export const Deemo: React.FC<Props> = ({ size, mood = "idle", lid = 1, look = [0, 0], wings, spark = 1, style }) => {
  const [wl, wr] = wings ?? (mood === "cheering" ? [128, -128] : mood === "reading" ? [-38, 38] : [0, 0]);
  return (
    <svg viewBox={VIEWBOX} width={size} height={size * (364 / 344)} style={{ overflow: "visible", ...style }}>
      <g fill={C.amber} stroke={C.amberInk} strokeWidth={3}>
        {[176, 224].flatMap((x) =>
          [-11, 0, 11].map((d) => (
            <ellipse key={`${x}${d}`} cx={x + d * 0.9} cy={345} rx={5.5} ry={8} transform={`rotate(${d * 1.8} ${x + d * 0.9} 345)`} />
          )),
        )}
      </g>
      <path d={BODY} fill={C.dusk} />
      <ellipse cx={200} cy={298} rx={68} ry={42} fill={C.paper} />
      {mood === "reading" ? null : (
        <g fill="none" stroke={C.duskIcon} strokeOpacity={0.5} strokeWidth={3.5} strokeLinecap="round">
          {[
            [180, 288],
            [200, 288],
            [220, 288],
            [190, 306],
            [210, 306],
            [200, 324],
          ].map(([x, y]) => (
            <path key={`${x}${y}`} d={`M${x! - 8} ${y} Q${x} ${y! + 8} ${x! + 8} ${y}`} />
          ))}
        </g>
      )}
      <path d={BODY} fill="none" strokeWidth={LINE} {...ink} />
      <path d={FACE} fill={C.duskTint} />
      <ellipse cx={116} cy={246} rx={15} ry={8.5} fill={C.clayTint} opacity={0.9} />
      <ellipse cx={284} cy={246} rx={15} ry={8.5} fill={C.clayTint} opacity={0.9} />

      {mood === "cheering"
        ? EYES.map((x) => <path key={x} d={`M${x - 22} 212 Q${x} 184 ${x + 22} 212`} fill="none" strokeWidth={7} {...ink} />)
        : EYES.map((x, i) => {
            const pupil = 17;
            const room = EYE_R - pupil - 3;
            const gx = Math.max(-room, Math.min(room, (mood === "reading" ? 0 : i ? -3 : 3) + look[0]));
            const gy = Math.max(-room, Math.min(room, (mood === "reading" ? 9 : 2) + look[1]));
            const open = lid >= 0.5;
            return (
              <g key={x}>
                <ellipse cx={x} cy={EYE_Y} rx={EYE_R} ry={EYE_R * Math.max(0.08, lid)} fill={C.paper} strokeWidth={LINE - 1} {...ink} />
                {open ? (
                  <>
                    <circle cx={x + gx} cy={EYE_Y + gy} r={pupil} fill={C.duskInk} />
                    <circle cx={x + gx + pupil * 0.38} cy={EYE_Y + gy - pupil * 0.42} r={pupil * 0.36} fill={C.paper} />
                    <circle cx={x + gx - pupil * 0.4} cy={EYE_Y + gy + pupil * 0.36} r={pupil * 0.15} fill={C.paper} />
                  </>
                ) : null}
              </g>
            );
          })}

      {mood === "cheering" ? (
        <>
          <path d="M190 237 Q200 233 210 237 Q206 244 200 246 Q194 244 190 237 Z" fill={C.amber} stroke={C.amberInk} strokeWidth={3} strokeLinejoin="round" />
          <path d="M194 248 Q200 258 206 248 Z" fill={C.amberInk} />
        </>
      ) : (
        <path d="M191 238 Q200 233 209 238 Q205 249 200 253 Q195 249 191 238 Z" fill={C.amber} stroke={C.amberInk} strokeWidth={3} strokeLinejoin="round" />
      )}

      {mood === "reading" ? (
        <g transform="rotate(-4 200 300)">
          <rect x={146} y={262} width={108} height={72} rx={8} fill={C.paper} stroke={C.inkMuted} strokeWidth={3.5} />
          <path d="M162 282 H238 M162 296 H230 M162 310 H214" stroke={C.duskSoft} strokeWidth={5} strokeLinecap="round" />
        </g>
      ) : null}

      {(["l", "r"] as const).map((side) => {
        const { d, o, f } = WING[side];
        return (
          <g key={side} transform={`rotate(${side === "l" ? wl : wr} ${o[0]} ${o[1]})`}>
            <path d={d} fill={C.duskIcon} strokeWidth={LINE} {...ink} />
            <path d={f} fill="none" stroke={C.duskInk} strokeOpacity={0.4} strokeWidth={3.5} strokeLinecap="round" />
          </g>
        );
      })}

      {/* mortarboard */}
      <g transform={`translate(0 ${mood === "cheering" ? -6 : 0}) rotate(-6 200 112)`}>
        <path d="M148 114 Q200 102 252 114 L248 136 Q200 126 152 136 Z" fill={C.ink} stroke={C.ink} strokeWidth={LINE} strokeLinejoin="round" />
        <path d="M200 68 L286 96 L200 124 L114 96 Z" fill={C.ink} stroke={C.ink} strokeWidth={LINE} strokeLinejoin="round" />
        <path d="M200 76 L262 96 L200 116 L138 96 Z" fill={C.inkSoft} />
        <path d="M200 96 Q246 94 280 100 L280 134" fill="none" stroke={C.amber} strokeWidth={4} strokeLinecap="round" />
        <circle cx={200} cy={96} r={6} fill={C.amber} stroke={C.amberInk} strokeWidth={2.5} />
        <rect x={273} y={130} width={14} height={22} rx={5} fill={C.amber} stroke={C.amberInk} strokeWidth={3} />
      </g>

      {mood === "cheering" ? (
        <g fill={C.amber} opacity={spark}>
          {[
            [70, 120, 14],
            [334, 104, 11],
            [352, 160, 8],
          ].map(([x, y, r]) => {
            const q = r! * 0.15;
            const s = r! * spark;
            return (
              <path
                key={x}
                d={`M${x} ${y! - s} Q${x! + q} ${y! - q} ${x! + s} ${y} Q${x! + q} ${y! + q} ${x} ${y! + s} Q${x! - q} ${y! + q} ${x! - s} ${y} Q${x! - q} ${y! - q} ${x} ${y! - s}Z`}
              />
            );
          })}
        </g>
      ) : null}
    </svg>
  );
};
