"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { can, type StaffRole } from "@/domain/auth/permissions";
import type { OrderEvent } from "@/domain/order/machine";
import { db } from "../db/client";
import { kickDispatch } from "../notify/kick";
import { appUrl, paymentProvider } from "../payments/factory";
import { currentStaff } from "../staff/session";
import { moveDelivery } from "./customer";
import { type DeliveryResult, driverAction, refundOrder, shopDecision } from "./delivery";

const id = z.string().uuid();
const NOT_PERMITTED: DeliveryResult = { ok: false, problem: { key: "NOT_PERMITTED" } };

async function asStaff(orderId: string, fn: (staff: { id: string; role: string }) => Promise<DeliveryResult>): Promise<DeliveryResult> {
  const staff = await currentStaff();
  if (!staff) return NOT_PERMITTED;
  if (!id.safeParse(orderId).success) return { ok: false, problem: { key: "NOT_FOUND" } };
  const r = await fn(staff);
  kickDispatch();
  refresh();
  return r;
}

export async function staffDriverAction(orderId: string, event: OrderEvent) {
  return asStaff(orderId, (staff) => driverAction(db, { orderId, event, staff, appUrl: appUrl() }));
}

export async function staffShopDecision(input: { orderId: string; decision: "CANCEL" | "FORCE_DISPATCH"; reason: string }) {
  const decision = input.decision === "FORCE_DISPATCH" ? "FORCE_DISPATCH" : "CANCEL";
  return asStaff(input.orderId, (staff) =>
    shopDecision(db, paymentProvider(), { orderId: input.orderId, decision, reason: String(input.reason ?? "").slice(0, 300), staff, appUrl: appUrl() }),
  );
}

export async function staffRefund(input: { orderId: string; amountAgorot: number; reason: string }) {
  return asStaff(input.orderId, (staff) =>
    refundOrder(db, paymentProvider(), { orderId: input.orderId, amountAgorot: Number(input.amountAgorot), reason: String(input.reason ?? "").slice(0, 300), staff, appUrl: appUrl() }),
  );
}

/** A manager on the phone with a customer who wasn't home moves the delivery for them — same cold-chain rule as the customer's own link. */
export async function staffMoveDelivery(orderId: string, slotId: string) {
  const staff = await currentStaff();
  if (!staff || !can(staff.role as StaffRole, "OVERRIDE")) return { ok: false as const, problem: { key: "NOT_PERMITTED" as const } };
  if (!id.safeParse(orderId).success || !id.safeParse(slotId).success) return { ok: false as const, problem: { key: "NOT_FOUND" as const } };
  const r = await moveDelivery(db, { orderId, slotId, actor: staff.role as StaffRole, actorId: staff.id, appUrl: appUrl() });
  kickDispatch();
  refresh();
  return r;
}
