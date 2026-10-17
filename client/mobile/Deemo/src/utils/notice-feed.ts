import { createStore } from "./store";

export type Notice = { id: string; title: string; body: string; createdAt: string; readAt: string | null };
export type NoticePage = { notices: Notice[]; unread: number; nextCursor: string | null };
type State = NoticePage & { owner: string | null; loaded: boolean; loading: boolean; error: string; dismissed: string[] };
const initial = (owner: string | null = null): State => ({ owner, notices: [], unread: 0, nextCursor: null, loaded: false, loading: false, error: "", dismissed: [] });

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
  dismiss = (id: string) => this.store.set({ dismissed: [...this.store.get().dismissed, id] });

  private fetch(before?: string): Promise<void> {
    if (this.pending) {
      if (!before) this.again = true;
      return this.pending;
    }
    const epoch = this.epoch;
    this.store.set({ loading: true, error: "" });
    const task = this.load(before).then((page) => {
      if (epoch !== this.epoch) return;
      const state = this.store.get();
      const ids = new Set(page.notices.map((n) => n.id));
      const list = before
        ? [...state.notices.filter((n) => !ids.has(n.id)), ...page.notices]
        : [...page.notices, ...state.notices.filter((n) => !ids.has(n.id))];
      this.store.set({
        ...page, notices: list, loaded: true,
        nextCursor: !before && state.notices.length > 30 ? state.nextCursor : page.nextCursor,
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
