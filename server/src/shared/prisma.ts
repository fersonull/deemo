import { PrismaPg } from "@prisma/adapter-pg";

import { Prisma, PrismaClient } from "../../generated/prisma/client";
import { config } from "./config";

// One Prisma client for the whole server (Prisma ORM 7 needs a driver adapter; pg works under Bun).
export const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: config.DATABASE_URL }) });

export type Tx = Prisma.TransactionClient;
export { Prisma };

// Serializable transactions for the rules that must hold under concurrent requests (the free-tier manuscript slot,
// group joins, the daily practice cap). Postgres aborts one side of a conflict (Prisma P2034); retry it a few times.
export async function withSerializable<T>(fn: (tx: Tx) => Promise<T>, retries = 5): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(fn, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5_000,
        timeout: 15_000,
      });
    } catch (err) {
      const conflict = err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034";
      if (!conflict || attempt >= retries) throw err;
      await Bun.sleep(15 * 2 ** attempt + Math.random() * 15);
    }
  }
}

// "Record to update/delete not found": the row was deleted meanwhile (a student deleted the project or their data).
export const isMissing = (err: unknown) => err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025";
export const isDuplicate = (err: unknown) => err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
