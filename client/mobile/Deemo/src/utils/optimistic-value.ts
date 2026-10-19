// One setting at a time: show it now, restore the confirmed value on failure, and ignore replies after reset.
export function optimisticValue<T>(read: () => T, write: (value: T, saving: boolean) => void, save: (value: T) => Promise<T>) {
  let version = 0;
  let pending: Promise<void> | null = null;
  return {
    get version() { return version; },
    get saving() { return pending !== null; },
    reset() {
      version++;
      pending = null;
    },
    set(value: T): Promise<void> {
      if (pending) return pending;
      const previous = read();
      if (Object.is(value, previous)) return Promise.resolve();
      const started = ++version;
      write(value, true);
      pending = Promise.resolve().then(async () => {
        if (started !== version) return;
        try {
          const confirmed = await save(value);
          if (started !== version) return;
          pending = null;
          version++;
          write(confirmed, false);
        } catch (error) {
          if (started !== version) return;
          pending = null;
          version++;
          write(previous, false);
          throw error;
        }
      });
      return pending;
    },
  };
}
