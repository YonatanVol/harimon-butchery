"use server";

import { z } from "zod";
import { db } from "../db/client";
import { checkStaffPin } from "./pinCheck";
import { endStaffSession, startStaffSession } from "./session";


export type StaffLoginResult =
  | { ok: true }
  | { ok: false; problem: { key: "WRONG_PIN"; attemptsLeft: number } | { key: "LOCKED"; minutes: number } | { key: "UNKNOWN" } };

export async function staffLogin(staffId: string, pin: string): Promise<StaffLoginResult> {
  if (!z.string().uuid().safeParse(staffId).success || !/^\d{4,8}$/.test(pin)) return { ok: false, problem: { key: "UNKNOWN" } };
  const checked = await checkStaffPin(db, staffId, pin);
  if (!checked.ok) return checked;
  await startStaffSession(checked.member.id);
  return { ok: true };
}

export async function staffLogout() {
  await endStaffSession();
}
