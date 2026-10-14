import type { Tx } from "../../../shared/prisma";
import type { StartState } from "../domain/live-start";

type Row = {
  day: string;
  setup: string;
  lease: string;
  pendingUntil: Date;
  expiresAt: Date;
  token: string | null;
  newSessionUntil: Date | null;
};

const toState = (r: Row): StartState => ({
  day: r.day,
  setup: r.setup,
  lease: r.lease,
  pendingUntil: r.pendingUntil.getTime(),
  expiresAt: r.expiresAt.getTime(),
  ...(r.token && { token: r.token }),
  ...(r.newSessionUntil && { newSessionUntil: r.newSessionUntil.getTime() }),
});

const toData = (s: StartState) => ({
  day: s.day,
  setup: s.setup,
  lease: s.lease,
  pendingUntil: new Date(s.pendingUntil),
  expiresAt: new Date(s.expiresAt),
  token: s.token ?? null,
  newSessionUntil: s.newSessionUntil ? new Date(s.newSessionUntil) : null,
});

const key = (userId: string, id: string) => ({ userId_id: { userId, id } });

// Always used inside the practice module's serializable transactions.
export const liveStartRepo = {
  async find(tx: Tx, userId: string, id: string) {
    const row = await tx.liveStart.findUnique({ where: key(userId, id) });
    return row && toState(row);
  },
  save: (tx: Tx, userId: string, id: string, s: StartState) =>
    tx.liveStart.upsert({ where: key(userId, id), create: { userId, id, ...toData(s) }, update: toData(s) }),
  remove: (tx: Tx, userId: string, id: string) => tx.liveStart.deleteMany({ where: { userId, id } }),
};
