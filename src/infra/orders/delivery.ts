import { and, asc, eq, inArray, ne, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { can, type StaffRole } from "@/domain/auth/permissions";
import { agorot } from "@/domain/money/agorot";
import { formatAgorot } from "@/domain/money/format";
import type { OrderEvent } from "@/domain/order/machine";
import type { PaymentProvider } from "@/domain/payments/provider";
import type * as schema from "../db/schema";
import { customer, deliverySlot, deliveryZone, order, paymentIntent, paymentRefund } from "../db/schema";
import { applyOrderEvent } from "./events";

type Database = PostgresJsDatabase<typeof schema>;
type Staff = { id: string; role: string };

export type DeliveryProblem =
  | { key: "NOT_PERMITTED" }
  | { key: "NOT_FOUND" }
  | { key: "WRONG_STATE"; reason: string }
  | { key: "REASON_REQUIRED" }
  | { key: "INVALID_AMOUNT"; maxAgorot: number }
  | { key: "REFUND_FAILED" };

export type DeliveryResult = { ok: true } | { ok: false; problem: DeliveryProblem };

const DRIVER_EVENTS: OrderEvent[] = ["DISPATCHED", "DELIVERED", "NOT_HOME", "REFUSED", "RETURNED_TO_SHOP"];

/** One driver action on one order, through the state machine. */
export async function driverAction(
  db: Database,
  { orderId, event, staff, appUrl, now }: { orderId: string; event: OrderEvent; staff: Staff; appUrl: string; now?: Date },
): Promise<DeliveryResult> {
  if (!DRIVER_EVENTS.includes(event)) return { ok: false, problem: { key: "NOT_FOUND" } };
  if (!can(staff.role as StaffRole, "DELIVER")) return { ok: false, problem: { key: "NOT_PERMITTED" } };
  return db.transaction(async (tx): Promise<DeliveryResult> => {
    const moved = await applyOrderEvent(tx, { orderId, event, ctx: { actor: staff.role as StaffRole }, actorId: staff.id, appUrl, now });
    if (!moved.ok) return { ok: false, problem: moved.reason === "NOT_PERMITTED" ? { key: "NOT_PERMITTED" } : { key: "WRONG_STATE", reason: moved.reason } };
    if (event === "DISPATCHED") {
      await tx.update(order).set({ assignedDriverId: staff.id, deliveryAttempts: sql`${order.deliveryAttempts} + 1` }).where(eq(order.id, orderId));
    }
    return { ok: true };
  });
}

/**
 * A manager refunds a returned or delivered order, fully or partly. The reason is required and recorded.
 * Returned meat goes back into stock as spoilage — it can't be resold.
 */
export async function refundOrder(
  db: Database,
  provider: PaymentProvider,
  { orderId, amountAgorot, reason, staff, appUrl, now = new Date() }: { orderId: string; amountAgorot: number; reason: string; staff: Staff; appUrl: string; now?: Date },
): Promise<DeliveryResult> {
  if (!can(staff.role as StaffRole, "REFUND")) return { ok: false, problem: { key: "NOT_PERMITTED" } };
  if (reason.trim().length < 10) return { ok: false, problem: { key: "REASON_REQUIRED" } };

  const [o] = await db.select().from(order).where(eq(order.id, orderId));
  if (!o) return { ok: false, problem: { key: "NOT_FOUND" } };
  const refundable = (o.capturedAgorot ?? 0) - o.refundedAgorot;
  if (!Number.isSafeInteger(amountAgorot) || amountAgorot <= 0 || amountAgorot > refundable) return { ok: false, problem: { key: "INVALID_AMOUNT", maxAgorot: refundable } };

  const [intent] = await db
    .select()
    .from(paymentIntent)
    .where(and(eq(paymentIntent.orderId, orderId), eq(paymentIntent.status, "AUTHORIZED"), ne(paymentIntent.purpose, "EXTRA")));
  if (!intent?.providerTransactionRef) return { ok: false, problem: { key: "NOT_FOUND" } };

  const requested = await db.transaction((tx) =>
    applyOrderEvent(tx, { orderId, event: "REFUND_REQUESTED", ctx: { actor: staff.role as StaffRole, reason }, actorId: staff.id, appUrl, now, payload: { amountAgorot } }),
  );
  if (!requested.ok) return { ok: false, problem: requested.reason === "REASON_REQUIRED" ? { key: "REASON_REQUIRED" } : { key: "WRONG_STATE", reason: requested.reason } };

  const idempotencyKey = `order:${orderId}:refund:${o.refundedAgorot}:${amountAgorot}`;
  const r = await provider.refund({ transactionRef: intent.providerTransactionRef, amountAgorot, idempotencyKey });

  return db.transaction(async (tx): Promise<DeliveryResult> => {
    await tx.insert(paymentRefund).values({
      paymentIntentId: intent.id,
      amountAgorot,
      reasonKey: reason.trim().slice(0, 200),
      requestedByStaffId: staff.id,
      status: r.ok ? "SUCCEEDED" : "FAILED",
      idempotencyKey,
      providerRefundRef: r.ok ? r.refundRef : null,
    });
    if (!r.ok) return { ok: false, problem: { key: "REFUND_FAILED" } };

    const [updated] = await tx
      .update(order)
      .set({ refundedAgorot: sql`${order.refundedAgorot} + ${amountAgorot}` })
      .where(eq(order.id, orderId))
      .returning();
    const full = updated.refundedAgorot >= (updated.capturedAgorot ?? 0);
    await applyOrderEvent(tx, {
      orderId,
      event: full ? "REFUND_SUCCEEDED_FULL" : "REFUND_SUCCEEDED_PARTIAL",
      ctx: { actor: "PSP" },
      appUrl,
      now,
      payload: { templateVars: { refundAmount: formatAgorot(agorot(amountAgorot), o.locale === "en" ? "en" : "he") } },
    });

    return { ok: true };
  });
}

/** Today's delivery run: everything packed or on the road, grouped by window. */
export async function loadDeliveryRun(db: Database, serviceDate: string) {
  return db
    .select({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      unpaidDispatch: order.unpaidDispatch,
      address: order.addressSnapshot,
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phoneE164,
      zoneHe: deliveryZone.nameHe,
      zoneEn: deliveryZone.nameEn,
      startsAt: deliverySlot.startsAt,
      endsAt: deliverySlot.endsAt,
      note: order.customerNote,
      attempts: order.deliveryAttempts,
    })
    .from(order)
    .innerJoin(customer, eq(customer.id, order.customerId))
    .innerJoin(deliveryZone, eq(deliveryZone.id, order.zoneId))
    .innerJoin(deliverySlot, eq(deliverySlot.id, order.slotId))
    .where(and(eq(deliverySlot.serviceDate, serviceDate), inArray(order.status, ["PACKED", "OUT_FOR_DELIVERY", "RESCHEDULED", "DELIVERY_FAILED_NOT_HOME", "DELIVERED"])))
    .orderBy(asc(deliverySlot.startsAt), asc(deliveryZone.sortOrder));
}



/**
 * Manager decisions on a stuck or unwanted order: cancel (the hold is released, cut meat returns to
 * stock) or dispatch without payment (flagged on every screen). Both need a written reason.
 */
export async function shopDecision(
  db: Database,
  provider: PaymentProvider,
  { orderId, decision, reason, staff, appUrl, now = new Date() }: { orderId: string; decision: "CANCEL" | "FORCE_DISPATCH"; reason: string; staff: Staff; appUrl: string; now?: Date },
): Promise<DeliveryResult> {
  if (!can(staff.role as StaffRole, decision === "CANCEL" ? "CANCEL_ORDER" : "OVERRIDE")) return { ok: false, problem: { key: "NOT_PERMITTED" } };
  const event = decision === "CANCEL" ? "CANCELLED_BY_SHOP" : "FORCE_DISPATCHED";
  const result = await db.transaction(async (tx) => {
    const moved = await applyOrderEvent(tx, { orderId, event, ctx: { actor: staff.role as StaffRole, reason }, actorId: staff.id, appUrl, now, payload: { templateVars: { reason } } });
    if (!moved.ok) return moved;
    if (decision === "FORCE_DISPATCH") await tx.update(order).set({ unpaidDispatch: true }).where(eq(order.id, orderId));
    return moved;
  });
  if (!result.ok) {
    return { ok: false, problem: result.reason === "REASON_REQUIRED" ? { key: "REASON_REQUIRED" } : result.reason === "NOT_PERMITTED" ? { key: "NOT_PERMITTED" } : { key: "WRONG_STATE", reason: result.reason } };
  }
  if (result.effects.includes("VOID_AUTHORIZATION")) {
    const [intent] = await db.select().from(paymentIntent).where(and(eq(paymentIntent.orderId, orderId), eq(paymentIntent.status, "AUTHORIZED"), ne(paymentIntent.purpose, "EXTRA")));
    if (intent?.providerTransactionRef) {
      await provider.voidAuthorization({ transactionRef: intent.providerTransactionRef });
      await db.update(paymentIntent).set({ status: "VOIDED" }).where(eq(paymentIntent.id, intent.id));
    }
  }
  return { ok: true };
}
