import { makeMutable } from "react-native-reanimated";

// Where the student's finger is, app-wide (pageX/pageY), fed by the root layout's touch handlers and read on the
// UI thread. Deemo's eyes follow it. `down` is false once the finger lifts; `at` is when it last changed.
export const touchPoint = makeMutable({ x: 0, y: 0, down: false, at: 0 });

export function trackTouch(x: number, y: number, down: boolean) {
  touchPoint.value = { x, y, down, at: Date.now() };
}
