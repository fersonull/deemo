import { useEffect, useState } from "react";
import { useReducedMotion } from "react-native-reanimated";

const DURATION = 700;

// A number that counts up from 0 once (the report's score reveal). Only this tiny component re-renders while it
// counts, never the screen around it; frames come from requestAnimationFrame with an ease-out, so it settles
// gently. With reduce motion it shows the number straight away.
export function CountUp({ to }: { to: number }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(reduced ? to : 0);
  useEffect(() => {
    if (reduced) return;
    let frame = 0;
    const start = Date.now();
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / DURATION);
      setShown(Math.round(to * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [to, reduced]);
  return <>{reduced ? to : shown}</>;
}
