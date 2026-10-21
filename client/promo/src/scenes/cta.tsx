// Call to action, one column on dusk: the app icon, the tagline, and "Available on Android".
import type React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { AppIcon } from "../components/app-icon";
import { ios } from "../motion";
import { C, F, Icon, surface, Words } from "../ui";

export const Cta: React.FC<{ len: number }> = () => {
  const f = useCurrentFrame();
  const icon = ios(f, 20, 170);
  const pill = ios(f, 76, 200);
  const line: React.CSSProperties = { justifyContent: "center", fontFamily: F.display, fontWeight: 800, fontSize: 88, letterSpacing: -3, color: C.paper, lineHeight: 1.04 };
  return (
    <AbsoluteFill style={{ flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 44 }}>
      <AppIcon
        size={300}
        style={{
          opacity: Math.min(1, icon * 1.4),
          transform: `translateY(${(1 - icon) * 120 - Math.sin(f / 30) * 6 * icon}px) scale(${0.5 + 0.5 * icon}) rotate(${(1 - icon) * -12}deg)`,
          filter: `blur(${(1 - Math.min(1, icon)) * 14}px)`,
        }}
      />
      <div>
        <Words text="Practice the defense," at={36} stagger={4} style={line} />
        <Words text="*before* the defense." at={48} stagger={4} accent={C.duskTint} style={line} />
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          ...surface("paper", 999, 6),
          padding: "18px 34px",
          fontFamily: F.body,
          fontWeight: 700,
          fontSize: 28,
          opacity: pill,
          transform: `translateY(${(1 - pill) * 40}px)`,
        }}
      >
        <Icon name="android" size={32} color={C.sage} /> Available on Android
      </div>
    </AbsoluteFill>
  );
};
