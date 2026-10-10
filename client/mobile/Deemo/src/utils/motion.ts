import { FadeIn, FadeInDown, ReduceMotion } from "react-native-reanimated";

import { easeOut } from "@/theme";

// Content arriving after a wait (a report, a summary): rises 8 px while fading in, 250 ms.
// With the system's reduce-motion setting it still fades (gentler, not gone), without moving.
export function riseIn(delay = 0, reduced = false) {
  if (reduced) return FadeIn.duration(200).delay(delay).reduceMotion(ReduceMotion.Never);
  return FadeInDown.duration(250)
    .delay(delay)
    .easing(easeOut)
    .withInitialValues({ opacity: 0, transform: [{ translateY: 8 }] });
}
