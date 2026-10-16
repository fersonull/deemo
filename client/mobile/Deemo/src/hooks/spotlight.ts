import { useEffect, useState } from "react";
import { cancelAnimation, makeMutable, useAnimatedStyle, withDelay, withTiming } from "react-native-reanimated";

// Once per app launch, Home opens with a spotlight on Deemo and its brief: Deemo waves while everything else (the
// rest of Home and the tab bar) waits at low opacity, then fades up. A touch anywhere on Home ends it early.
const DIM = 0.25;
const HOLD_MS = 2400;

// The opacity of everything outside the spotlight, shared by Home and the tab bar (read on the UI thread).
export const spotlightRest = makeMutable(DIM);
let spotlit = false; // this launch's spotlight has run (or started)

export const useSpotlightStyle = () => useAnimatedStyle(() => ({ opacity: spotlightRest.value }));

// `ready`: Home's brief is on screen (or Home can't show it, e.g. offline: then it just ends). `greet` is true while
// the spotlight holds, for Deemo's wave.
export function useSpotlight(ready: boolean) {
  const [greet, setGreet] = useState(!spotlit);
  useEffect(() => {
    if (!ready || spotlit) return;
    spotlit = true;
    spotlightRest.set(withDelay(HOLD_MS, withTiming(1, { duration: 600 })));
    setTimeout(() => setGreet(false), HOLD_MS); // not cleared: the wave must end even if `ready` flickers
  }, [ready]);
  const end = () => {
    setGreet(false);
    if (spotlightRest.get() >= 1) return;
    cancelAnimation(spotlightRest);
    spotlightRest.set(withTiming(1, { duration: 250 }));
  };
  return { greet, end };
}
