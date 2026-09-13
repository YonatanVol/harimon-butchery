"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "../db/client";
import { kickDispatch } from "../notify/kick";
import { appUrl, paymentProvider } from "../payments/factory";
import { cancelByCustomer, decideExtra, rescheduleDelivery } from "./customer";

const orderNumber = z.string().regex(/^\d{4}-\d{5}$/);
const token = z.string().min(16).max(64);

export async function customerDecideExtra(input: { orderNumber: string; token: string; decision: "APPROVE" | "TRIM" }) {
  if (!orderNumber.safeParse(input.orderNumber).success || !token.safeParse(input.token).success) return { ok: false as const, problem: { key: "NOT_FOUND" as const } };
  const r = await decideExtra(db, paymentProvider(), { ...input, decision: input.decision === "APPROVE" ? "APPROVE" : "TRIM", appUrl: appUrl() });
  kickDispatch();
  refresh();
  return r;
}

export async function customerCancel(input: { orderNumber: string; token: string }) {
  if (!orderNumber.safeParse(input.orderNumber).success || !token.safeParse(input.token).success) return { ok: false as const, problem: { key: "NOT_FOUND" as const } };
  const r = await cancelByCustomer(db, paymentProvider(), { ...input, appUrl: appUrl() });
  kickDispatch();
  refresh();
  return r;
}

export async function customerReschedule(input: { orderNumber: string; token: string; slotId: string }) {
  if (!orderNumber.safeParse(input.orderNumber).success || !token.safeParse(input.token).success || !z.string().uuid().safeParse(input.slotId).success) {
    return { ok: false as const, problem: { key: "NOT_FOUND" as const } };
  }
  const r = await rescheduleDelivery(db, { ...input, appUrl: appUrl() });
  kickDispatch();
  refresh();
  return r;
}
