type Change = { key: string; targetId: string | null };

// One DB scan per server, not per connected phone. Payloads contain no notice text or recipient identifiers.
export class NoticeHub {
  private clients = new Map<() => void, string>();
  private seen = new Set<string>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private scanning = false;

  constructor(private scan: () => Promise<Change[]>, private intervalMs = 2000) {}

  subscribe(uid: string, refresh: () => void) {
    this.clients.set(refresh, uid);
    if (!this.timer) {
      void this.poll();
      this.timer = setInterval(() => void this.poll(), this.intervalMs);
      this.timer.unref();
    }
    return () => {
      this.clients.delete(refresh);
      if (!this.clients.size && this.timer) {
        clearInterval(this.timer);
        this.timer = null;
        this.seen.clear();
      }
    };
  }

  notify(targetId: string | null) {
    for (const [refresh, uid] of this.clients) if (targetId === null || targetId === uid) refresh();
  }

  async poll() {
    if (this.scanning) return;
    this.scanning = true;
    try {
      const changes = await this.scan();
      const changed = changes.filter((c) => !this.seen.has(c.key));
      this.seen = new Set(changes.map((c) => c.key));
      if (changed.some((c) => c.targetId === null)) this.notify(null);
      else for (const uid of new Set(changed.map((c) => c.targetId))) this.notify(uid);
    } catch {
      // A REST refresh can report the outage; keep scanning so recovery requires no app restart.
      for (const refresh of this.clients.keys()) refresh();
    } finally {
      this.scanning = false;
    }
  }
}
