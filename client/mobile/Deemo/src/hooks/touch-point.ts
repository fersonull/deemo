import { makeMutable } from "react-native-reanimated";

// Where the student's finger is, app-wide (pageX/pageY), fed by the root layout's touch handlers and read on the
// UI thread. Deemo's eyes follow it. `down` is false once the finger lifts; `at` is when it last changed.
export const touchPoint = makeMutable({ x: 0, y: 0, down: false, at: 0 });

const EVERY_MS = 33; // ~30 updates a second while the finger moves; presses and lifts always go through

let last = 0;
let wasDown = false; // kept here, so the JS thread never reads the shared value back
export function trackTouch(x: number, y: number, down: boolean) {
  const now = Date.now();
  if (down && wasDown && now - last < EVERY_MS) return;
  last = now;
  wasDown = down;
  touchPoint.value = { x, y, down, at: now };
}
