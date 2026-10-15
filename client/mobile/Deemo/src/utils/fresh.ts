// Skip a reload that would only fetch what the app already has: a load that succeeded less than `maxAgeMs` ago is
// reused, and a load still running is shared instead of started twice. `force` (pull to refresh) always reloads.
// `load` resolves true only when it stored the result, so a failed or discarded load leaves the data stale.
export function freshFor(maxAgeMs: number, now = Date.now) {
  let loadedAt = -Infinity;
  let running: Promise<void> | null = null;
  return {
    run(load: () => Promise<boolean>, force = false): Promise<void> {
      if (running) return running;
      if (!force && now() - loadedAt < maxAgeMs) return Promise.resolve();
      const p: Promise<void> = load()
        .then((ok) => {
          if (ok && running === p) loadedAt = now();
        })
        .finally(() => {
          if (running === p) running = null;
        });
      running = p;
      return p;
    },
    // The data changed (or the student signed out): the next run reloads, and a load in flight no longer counts.
    invalidate() {
      loadedAt = -Infinity;
      running = null;
    },
  };
}
