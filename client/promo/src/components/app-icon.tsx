// The app icon, drawn in code: a port of client/mobile/Deemo/assets/icon-src/icon.svg (the owl's face close up in its
// cap on a dusk-tint field, framed on the visible 72 × 72 like icon.png), inside a rounded square. Keep in step with the icon source.
import type React from "react";

const Eye: React.FC<{ x: number; px: number }> = ({ x, px }) => (
  <g transform={`translate(${x} 204) scale(1.18) translate(${-x} -204)`}>
    <circle cx={x} cy={209} r={38} fill="#4D57B7" opacity={0.35} filter="url(#iconSoft)" />
    <circle cx={x} cy={204} r={36} fill="#5A66C7" />
    <circle cx={x} cy={204} r={30} fill="url(#iconEye)" />
    <circle cx={px} cy={207} r={17} fill="#343996" />
    <circle cx={px + 6.5} cy={199.5} r={6.4} fill="#FFFFFF" />
    <circle cx={px - 6.8} cy={213.4} r={2.8} fill="#FFFFFF" />
  </g>
);

export const AppIcon: React.FC<{ size: number; style?: React.CSSProperties }> = ({ size, style }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: size * 0.23,
      overflow: "hidden",
      boxShadow: `0 ${size * 0.04}px 0 #343996, 0 ${size * 0.14}px ${size * 0.22}px -${size * 0.06}px rgba(25,22,19,0.5)`,
      ...style,
    }}
  >
    <svg viewBox="18 18 72 72" width={size} height={size}>
      <defs>
        <radialGradient id="iconBg" cx="50%" cy="38%" r="75%">
          <stop offset="0" stopColor="#DCE3FF" />
          <stop offset="1" stopColor="#CFD6F3" />
        </radialGradient>
        <radialGradient id="iconBody" cx="42%" cy="30%" r="75%">
          <stop offset="0" stopColor="#6E79D3" />
          <stop offset="0.55" stopColor="#5A66C7" />
          <stop offset="1" stopColor="#4D57B7" />
        </radialGradient>
        <radialGradient id="iconFace" cx="50%" cy="35%" r="70%">
          <stop offset="0" stopColor="#EEF1FF" />
          <stop offset="1" stopColor="#DCE3FF" />
        </radialGradient>
        <radialGradient id="iconEye" cx="45%" cy="38%" r="65%">
          <stop offset="0.6" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#F7F3EC" />
        </radialGradient>
        <linearGradient id="iconCap" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3E3731" />
          <stop offset="1" stopColor="#2A2420" />
        </linearGradient>
        <filter id="iconSoft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>
      <rect x={-10} y={-10} width={200} height={200} fill="url(#iconBg)" />
      <g transform="translate(54 62) scale(0.3) translate(-200 -204)">
        <path d="M200 112 C292 112 322 170 318 232 C314 300 268 344 200 344 C132 344 86 300 82 232 C78 170 108 112 200 112 Z" fill="url(#iconBody)" />
        <path d="M200 170 C178 144 116 144 112 200 C108 250 160 268 200 248 C240 268 292 250 288 200 C284 144 222 144 200 170 Z" fill="url(#iconFace)" />
        <ellipse cx={118} cy={250} rx={17} ry={9.5} fill="#F5DDD3" opacity={0.95} />
        <ellipse cx={282} cy={250} rx={17} ry={9.5} fill="#F5DDD3" opacity={0.95} />
        <Eye x={160} px={164} />
        <Eye x={240} px={236} />
        <path d="M190 240 Q200 234 210 240 Q206 252 200 257 Q194 252 190 240 Z" fill="#EBB353" />
        <path d="M193 243 Q200 240 207 243" fill="none" stroke="#F6DC86" strokeWidth={2.5} strokeLinecap="round" />
        <g transform="translate(-4 10) rotate(-10 200 112) translate(200 112) scale(0.92) translate(-200 -112)">
          <ellipse cx={200} cy={140} rx={70} ry={10} fill="#343996" opacity={0.35} filter="url(#iconSoft)" />
          <path d="M146 112 Q200 98 254 112 L250 138 Q200 126 150 138 Z" fill="#2A2420" />
          <path d="M200 60 L296 92 L200 124 L104 92 Z" fill="url(#iconCap)" />
          <path d="M200 70 L268 92 L200 114 L132 92 Z" fill="#3E3731" opacity={0.6} />
          <path d="M200 92 Q252 90 288 96 L290 132" fill="none" stroke="#EBB353" strokeWidth={5} strokeLinecap="round" />
          <circle cx={200} cy={92} r={7} fill="#EBB353" />
          <circle cx={290} cy={136} r={9} fill="#EBB353" />
        </g>
      </g>
    </svg>
  </div>
);
