import { useId } from "react";
import { Circle, ClipPath, Defs, G, Path, Rect } from "react-native-svg";

import { colors } from "@/theme";

// The owl's body outline (same as index.tsx), for clipping the jacket to it.
const BODY =
  "M200 112 C292 112 322 170 318 232 C314 300 268 344 200 344 C132 344 86 300 82 232 C78 170 108 112 200 112 Z";

// Deemo's Premium suit, in the owl's units: a black jacket over the lower body from just under the cheeks (clipped
// to the outline), dark grey lapels, a paper shirt V with two buttons, and a gold bow tie at the collar. Flat fills
// only, like the rest of Deemo. The Premium medal is pinned on the right lapel (see badge.tsx).
export function Suit() {
  const clip = `suit${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const top = 262;
  const tie = { fill: colors.gold, stroke: colors.goldInk, strokeWidth: 2.5, strokeLinejoin: "round" } as const;
  return (
    <G>
      <Defs>
        <ClipPath id={clip}>
          <Path d={BODY} />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${clip})`}>
        <Rect x={60} y={top} width={280} height={100} fill={colors.ink} />
        <Path d={`M170 ${top} L184 ${top} L200 344 L190 344Z`} fill={colors.inkSoft} />
        <Path d={`M230 ${top} L216 ${top} L200 344 L210 344Z`} fill={colors.inkSoft} />
        <Path d={`M184 ${top} L216 ${top} L200 330Z`} fill={colors.paper} />
        <Circle cx={200} cy={300} r={3} fill={colors.ink} />
        <Circle cx={200} cy={316} r={3} fill={colors.ink} />
      </G>
      <Path d={`M200 ${top + 6} L184 ${top - 2} L184 ${top + 14}Z`} {...tie} />
      <Path d={`M200 ${top + 6} L216 ${top - 2} L216 ${top + 14}Z`} {...tie} />
      <Rect x={196} y={top + 1.5} width={8} height={9} rx={2.5} fill={colors.goldInk} />
    </G>
  );
}
