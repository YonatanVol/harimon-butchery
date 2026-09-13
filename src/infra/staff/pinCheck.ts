import { and, eq, isNull, lte, or, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type * as schema from "../db/schema";
import { staffUser } from "../db/schema";
import { verifyPin } from "./pin";

type Database = PostgresJsDatabase<typeof schema>;

export const MAX_PIN_ATTEMPTS = 5;
export const PIN_LOCK_MINUTES = 5;

export type PinCheck =
  | { ok: true; member: typeof staffUser.$inferSelect }
  | { ok: false; problem: { key: "WRONG_PIN"; attemptsLeft: number } | { key: "LOCKED"; minutes: number } | { key: "UNKNOWN" } };

/**
 * Checks a staff PIN with one attempt counter for every place a PIN is typed (sign-in, manager override).
 * The counter moves in a single UPDATE, so parallel guesses can't read the same count and slip past the lock.
 * Call it outside any transaction that might roll back, or a failed attempt would be forgotten.
 */
export async function checkStaffPin(db: Database, staffId: string, pin: string, now = new Date()): Promise<PinCheck> {
  const [member] = await db.select().from(staffUser).where(eq(staffUser.id, staffId));
  if (!member?.active) return { ok: false, problem: { key: "UNKNOWN" } };
  const lockedMinutes = (until: Date | null) => (until && until > now ? Math.ceil((until.getTime() - now.getTime()) / 60_000) : 0);
  if (lockedMinutes(member.lockedUntil)) return { ok: false, problem: { key: "LOCKED", minutes: lockedMinutes(member.lockedUntil) } };

  const notLocked = or(isNull(staffUser.lockedUntil), lte(staffUser.lockedUntil, now));
  if (!verifyPin(pin, member.pinHash)) {
    const [row] = await db
      .update(staffUser)
      .set({
        failedPinAttempts: sql`case when ${staffUser.failedPinAttempts} + 1 >= ${MAX_PIN_ATTEMPTS} then 0 else ${staffUser.failedPinAttempts} + 1 end`,
        lockedUntil: sql`case when ${staffUser.failedPinAttempts} + 1 >= ${MAX_PIN_ATTEMPTS} then ${new Date(now.getTime() + PIN_LOCK_MINUTES * 60_000).toISOString()}::timestamptz else null end`,
      })
      .where(and(eq(staffUser.id, staffId), notLocked))
      .returning({ attempts: staffUser.failedPinAttempts, lockedUntil: staffUser.lockedUntil });
    if (!row || lockedMinutes(row.lockedUntil)) return { ok: false, problem: { key: "LOCKED", minutes: PIN_LOCK_MINUTES } };
    return { ok: false, problem: { key: "WRONG_PIN", attemptsLeft: MAX_PIN_ATTEMPTS - row.attempts } };
  }

  // A right PIN counts only if the member wasn't locked by a parallel wrong guess in the meantime.
  const [ok] = await db
    .update(staffUser)
    .set({ failedPinAttempts: 0, lockedUntil: null, lastSeenAt: now })
    .where(and(eq(staffUser.id, staffId), notLocked))
    .returning();
  return ok ? { ok: true, member: ok } : { ok: false, problem: { key: "LOCKED", minutes: PIN_LOCK_MINUTES } };
}
