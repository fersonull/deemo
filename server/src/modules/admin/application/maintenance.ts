import type { NextFunction, Request, Response } from "express";

import type { AuthClaims } from "../../../shared/auth/authenticate";
import { AppError } from "../../../shared/errors";
import { prisma } from "../../../shared/prisma";
import { record } from "./actions";

// Maintenance mode: one row, switched from the web admin. Every student request checks it, so the row is read at most
// once per TTL per server (the free database plan counts operations); a switch on this server takes effect at once.
export type MaintenanceState = { on: boolean; message: string | null; updatedAt: string | null };

export const MAINTENANCE_MESSAGE = "DEEMO is getting an update. Try again in a little while; your sessions are safe.";
const TTL = 15_000;
let cached: { state: MaintenanceState; at: number } | null = null;

export async function maintenance(): Promise<MaintenanceState> {
  if (cached && Date.now() - cached.at < TTL) return cached.state;
  try {
    const row = await prisma.maintenance.findUnique({ where: { id: 1 } });
    const state = { on: row?.enabled ?? false, message: row?.message ?? null, updatedAt: row?.updatedAt.toISOString() ?? null };
    cached = { state, at: Date.now() };
    return state;
  } catch (e) {
    // Can't read it: keep the app open (or as last known) rather than locking every student out.
    console.error("maintenance: read failed", e);
    return cached?.state ?? { on: false, message: null, updatedAt: null };
  }
}

export async function setMaintenance(admin: AuthClaims, on: boolean, message: string | null) {
  const data = { enabled: on, message, updatedBy: admin.email ?? admin.uid };
  const row = await prisma.maintenance.upsert({ where: { id: 1 }, create: { id: 1, ...data }, update: data });
  await record(admin, on ? "maintenance_on" : "maintenance_off", { id: "app", email: null });
  const state = { on: row.enabled, message: row.message, updatedAt: row.updatedAt.toISOString() };
  cached = { state, at: Date.now() };
  return state;
}

// In front of the student routes: while maintenance is on they answer 503 MAINTENANCE with the admin's message.
export const requireOpen =
  (read: () => Promise<MaintenanceState> = maintenance) =>
  async (_req: Request, _res: Response, next: NextFunction) => {
    const m = await read();
    if (m.on) throw new AppError(503, m.message || MAINTENANCE_MESSAGE, "MAINTENANCE");
    next();
  };
