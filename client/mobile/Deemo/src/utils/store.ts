import { useSyncExternalStore } from "react";

// Tiny shared-state store: module-level state + useSyncExternalStore.
export function createStore<T extends object>(initial: T) {
  let state = initial;
  const listeners = new Set<() => void>();
  const subscribe = (l: () => void) => {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  };

  return {
    get: () => state,
    set(patch: Partial<T>) {
      state = { ...state, ...patch };
      listeners.forEach((l) => l());
    },
    use: () => useSyncExternalStore(subscribe, () => state),
  };
}
