"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client";
import { staffUser } from "../db/schema";
import { verifyPin } from "./pin";
import { endStaffSession, startStaffSession } from "./session";

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 5;

export type StaffLoginResult =
  | { ok: true }
  | { ok: false; problem: { key: "WRONG_PIN"; attemptsLeft: number } | { key: "LOCKED"; minutes: number } | { key: "UNKNOWN" } };

export async function staffLogin(staffId: string, pin: string): Promise<StaffLoginResult> {
  if (!z.string().uuid().safeParse(staffId).success || !/^\d{4,8}$/.test(pin)) return { ok: false, problem: { key: "UNKNOWN" } };
  const [member] = await db.select().from(staffUser).where(eq(staffUser.id, staffId));
  if (!member?.active) return { ok: false, problem: { key: "UNKNOWN" } };

  const now = new Date();
  if (member.lockedUntil && member.lockedUntil > now) {
    return { ok: false, problem: { key: "LOCKED", minutes: Math.ceil((member.lockedUntil.getTime() - now.getTime()) / 60000) } };
  }

  if (!verifyPin(pin, member.pinHash)) {
    const attempts = member.failedPinAttempts + 1;
    const locked = attempts >= MAX_ATTEMPTS;
    await db
      .update(staffUser)
      .set({ failedPinAttempts: locked ? 0 : attempts, lockedUntil: locked ? new Date(now.getTime() + LOCK_MINUTES * 60000) : null })
      .where(eq(staffUser.id, staffId));
    return locked
      ? { ok: false, problem: { key: "LOCKED", minutes: LOCK_MINUTES } }
      : { ok: false, problem: { key: "WRONG_PIN", attemptsLeft: MAX_ATTEMPTS - attempts } };
  }

  await db.update(staffUser).set({ failedPinAttempts: 0, lockedUntil: null, lastSeenAt: now }).where(eq(staffUser.id, staffId));
  await startStaffSession(member.id);
  return { ok: true };
}

export async function staffLogout() {
  await endStaffSession();
}
