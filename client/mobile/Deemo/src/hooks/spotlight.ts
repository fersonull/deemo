import { useEffect, useState } from "react";
import {
  cancelAnimation,
  makeMutable,
  useAnimatedStyle,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";

// Once per app launch, when Home has all its data, a spotlight falls on Deemo and its brief: a black scrim darkens
// everything else (the rest of Home and the tab bar) while Deemo waves, then lifts. A touch on Home ends it early.
const SCRIM = 0.6; // the scrim's strongest opacity
const IN_MS = 300;
const HOLD_MS = 2400;

// 0 → 1 → 0 over the spotlight, shared by Home and the tab bar (read on the UI thread).
export const spotlight = makeMutable(0);
let spotlit = false; // this launch's spotlight has run (or started)

// The black scrim over everything outside the spotlight.
export const useScrimStyle = () => useAnimatedStyle(() => ({ opacity: SCRIM * spotlight.value }));
// Paper-coloured layers that would show through the scrim (the fade above the tab bar) step aside instead.
export const useUnderScrimStyle = () => useAnimatedStyle(() => ({ opacity: 1 - spotlight.value }));

// `ready`: Home's data has all loaded and the brief is on screen. `greet` is true while the spotlight holds, for
// Deemo's wave.
export function useSpotlight(ready: boolean) {
  const [greet, setGreet] = useState(false);
  const [started, setStarted] = useState(spotlit);
  // Started during render (the React way to react to a prop), so Deemo's wave and the scrim begin together.
  if (ready && !started) {
    setStarted(true);
    setGreet(true);
  }
  useEffect(() => {
    if (!started || spotlit) return;
    spotlit = true;
    spotlight.set(
      withSequence(withTiming(1, { duration: IN_MS }), withDelay(HOLD_MS, withTiming(0, { duration: 600 }))),
    );
    setTimeout(() => setGreet(false), IN_MS + HOLD_MS); // not cleared: the wave must end even if `ready` flickers
  }, [started]);
  const end = () => {
    setGreet(false);
    if (spotlight.get() <= 0) return;
    cancelAnimation(spotlight);
    spotlight.set(withTiming(0, { duration: 250 }));
  };
  return { greet, end };
}
