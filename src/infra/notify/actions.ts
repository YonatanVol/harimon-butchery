"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { can, type StaffRole } from "@/domain/auth/permissions";
import { db } from "../db/client";
import { currentStaff } from "../staff/session";
import { requeue } from "./dispatch";
import { kickDispatch } from "./kick";

export async function resendNotification(id: string) {
  const staff = await currentStaff();
  if (!staff || !can(staff.role as StaffRole, "VIEW_MESSAGES") || !z.string().uuid().safeParse(id).success) return { ok: false };
  const ok = await requeue(db, id);
  if (ok) kickDispatch();
  refresh();
  return { ok };
}
