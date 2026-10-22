import { API_URL } from "@/constants";
import { createStore } from "@/utils/store";

// Maintenance mode, switched from the web admin. The app learns it two ways: any server call answering 503
// MAINTENANCE (utils/api.ts), or the public /status check on launch, on returning to the foreground, and every
// little while from the maintenance screen itself, which is also how it learns maintenance is over.
const store = createStore({ on: false, message: null as string | null, checkedAt: 0 });

export const maintenance = {
  enter(message: string | null) {
    store.set({ on: true, message, checkedAt: Date.now() });
  },
  // Asks the server; a network failure leaves the current state alone (the offline screens handle no connection).
  async check() {
    try {
      const res = await fetch(`${API_URL}/status`);
      if (!res.ok) return store.get().on;
      const { maintenance: m } = (await res.json()) as { maintenance: { on: boolean; message: string | null } };
      store.set({ on: m.on, message: m.message, checkedAt: Date.now() });
      return m.on;
    } catch {
      return store.get().on;
    }
  },
};
export const useMaintenance = () => store.use();
