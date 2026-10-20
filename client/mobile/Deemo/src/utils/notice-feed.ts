import { createStore } from "./store";

export type Notice = { id: string; title: string; body: string; createdAt: string; readAt: string | null };
export type NoticePage = { notices: Notice[]; unread: number; nextCursor: string | null };
type State = NoticePage & { owner: string | null; loaded: boolean; loading: boolean; error: string };
const initial = (owner: string | null = null): State => ({ owner, notices: [], unread: 0, nextCursor: null, loaded: false, loading: false, error: "" });

// Scope changes invalidate in-flight replies, so a previous student's inbox cannot appear after sign-out.
export class NoticeFeed {
  readonly store = createStore(initial());
  private epoch = 0;
  private pending: Promise<void> | null = null;
  private again = false;

  constructor(private load: (before?: string) => Promise<NoticePage>, private mark: (id: string) => Promise<unknown>) {}

  reset(owner: string | null = null) {
    this.epoch++;
    this.pending = null;
    this.again = false;
    this.store.set(initial(owner));
  }

  refresh = () => this.fetch();
  more = () => this.store.get().nextCursor ? this.fetch(this.store.get().nextCursor!) : Promise.resolve();

  private fetch(before?: string): Promise<void> {
    if (this.pending) {
      if (!before) this.again = true;
      return this.pending;
    }
    const epoch = this.epoch;
    this.store.set({ loading: true, error: "" });
    const task = this.load(before).then(async (page) => {
      if (epoch !== this.epoch) return;
      const state = this.store.get();
      let rows = page.notices;
      let nextCursor = page.nextCursor;
      // Refresh every loaded page so removed notices cannot survive in the cached tail.
      const cursors = new Set<string>();
      while (!before && nextCursor && rows.length < state.notices.length) {
        if (cursors.has(nextCursor)) throw new Error("Couldn't refresh notices. Try again.");
        cursors.add(nextCursor);
        const next = await this.load(nextCursor);
        if (epoch !== this.epoch) return;
        rows = [...rows, ...next.notices];
        nextCursor = next.nextCursor;
      }
      const list = [...new Map([...(before ? state.notices : []), ...rows].map((n) => [n.id, n])).values()];
      this.store.set({
        ...page, notices: list, loaded: true,
        nextCursor,
      });
    }).catch((e: unknown) => {
      if (epoch === this.epoch) this.store.set({ error: e instanceof Error ? e.message : "Couldn't load notices." });
    }).finally(() => {
      if (epoch !== this.epoch) return;
      this.pending = null;
      this.store.set({ loading: false });
      if (this.again) { this.again = false; void this.refresh(); }
    });
    this.pending = task;
    return task;
  }

  async read(id: string) {
    const epoch = this.epoch;
    await this.mark(id);
    if (epoch !== this.epoch) return;
    const state = this.store.get();
    const unread = state.notices.some((n) => n.id === id && !n.readAt);
    this.store.set({
      notices: state.notices.map((n) => n.id === id ? { ...n, readAt: n.readAt ?? new Date().toISOString() } : n),
      unread: Math.max(0, state.unread - Number(unread)),
    });
    void this.refresh();
  }
}
