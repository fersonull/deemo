import { useId } from "react";
import { ClipPath, Defs, G, Path, Rect } from "react-native-svg";

import { colors } from "@/theme";

// Deemo's Premium suit, in its 100 × 85 units: a dark dusk jacket over the lower body (clipped to the pebble, so
// it follows the outline), lapels in a lighter dusk, a white shirt V, and a gold bow tie at the collar.
// Flat fills only, like the rest of Deemo. The Premium badge is pinned on the right lapel (see badge.tsx).
export function Suit({ body }: { body: string }) {
  const clip = `suit${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const top = 63; // just under the mouth and cheeks
  return (
    <G>
      <Defs>
        <ClipPath id={clip}>
          <Path d={body} />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${clip})`}>
        {/* jacket */}
        <Rect x={0} y={top} width={100} height={30} fill={colors.duskInk} />
        {/* lapels: a lighter band along each side of the V */}
        <Path d={`M34 ${top} L42 ${top} L50 84 L45 84Z`} fill={colors.duskIcon} />
        <Path d={`M66 ${top} L58 ${top} L50 84 L55 84Z`} fill={colors.duskIcon} />
        {/* shirt */}
        <Path d={`M42 ${top} L58 ${top} L50 80Z`} fill={colors.paper} />
      </G>
      {/* bow tie at the collar */}
      <Path d={`M50 ${top + 3} L42 ${top - 1} L42 ${top + 7}Z`} fill={colors.gold} stroke={colors.goldInk} strokeWidth={1} strokeLinejoin="round" />
      <Path d={`M50 ${top + 3} L58 ${top - 1} L58 ${top + 7}Z`} fill={colors.gold} stroke={colors.goldInk} strokeWidth={1} strokeLinejoin="round" />
      <Rect x={48} y={top + 0.8} width={4} height={4.4} rx={1.2} fill={colors.goldInk} />
    </G>
  );
}
