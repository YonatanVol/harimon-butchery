import { and, asc, eq, inArray, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { can, type StaffRole } from "@/domain/auth/permissions";
import { agorot } from "@/domain/money/agorot";
import { formatAgorot } from "@/domain/money/format";
import { type OrderEvent, type OrderStatus, transition } from "@/domain/order/machine";
import type { PaymentProvider } from "@/domain/payments/provider";
import type * as schema from "../db/schema";
import { auditEvent, customer, deliverySlot, deliveryZone, order, paymentCapture, paymentIntent, paymentRefund } from "../db/schema";
import { applyOrderEvent } from "./events";
import { PaymentReturnFailed, returnPayments } from "./returnPayments";

type Database = PostgresJsDatabase<typeof schema>;
type Staff = { id: string; role: string };
type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

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
    await tx.insert(auditEvent).values({ actorType: "STAFF", actorId: staff.id, entityType: "order", entityId: orderId, action: `delivery.${event.toLowerCase()}`, before: { status: moved.from }, after: { status: moved.to } });
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

  // Locked from the amount check to the record: two managers refunding at once can't both pass the check.
  return db.transaction(async (tx): Promise<DeliveryResult> => {
    const [o] = await tx.select().from(order).where(eq(order.id, orderId)).for("update");
    if (!o) return { ok: false, problem: { key: "NOT_FOUND" } };
    const refundable = (o.capturedAgorot ?? 0) - o.refundedAgorot;
    if (!Number.isSafeInteger(amountAgorot) || amountAgorot <= 0 || amountAgorot > refundable) return { ok: false, problem: { key: "INVALID_AMOUNT", maxAgorot: refundable } };

    const sources = await refundSources(tx, o);
    if (sources.length === 0) return { ok: false, problem: { key: "NOT_FOUND" } };

    const requested = await applyOrderEvent(tx, { orderId, event: "REFUND_REQUESTED", ctx: { actor: staff.role as StaffRole, reason }, actorId: staff.id, appUrl, now, payload: { amountAgorot } });
    if (!requested.ok) return { ok: false, problem: requested.reason === "REASON_REQUIRED" ? { key: "REASON_REQUIRED" } : { key: "WRONG_STATE", reason: requested.reason } };

    // The main charge first, then any extra the customer approved: each transaction can only give back what it took.
    let left = amountAgorot;
    let succeeded = 0;
    let failed = false;
    for (const source of sources) {
      if (left === 0) break;
      const part = Math.min(left, source.remaining);
      if (part <= 0) continue;
      const idempotencyKey = `order:${orderId}:refund:${o.refundedAgorot}:${amountAgorot}:${source.intentId}`;
      const r = await provider.refund({ transactionRef: source.ref, amountAgorot: part, idempotencyKey });
      // Upsert: retrying a failed refund reuses its key, and the provider may report that it went through after all.
      await tx
        .insert(paymentRefund)
        .values({ paymentIntentId: source.intentId, amountAgorot: part, reasonKey: reason.trim().slice(0, 200), requestedByStaffId: staff.id, status: r.ok ? "SUCCEEDED" : "FAILED", idempotencyKey, providerRefundRef: r.ok ? r.refundRef : null })
        .onConflictDoUpdate({ target: paymentRefund.idempotencyKey, set: { status: r.ok ? "SUCCEEDED" : "FAILED", providerRefundRef: r.ok ? r.refundRef : null } });
      if (!r.ok) {
        failed = true;
        break;
      }
      succeeded += part;
      left -= part;
    }

    if (succeeded > 0) await tx.update(order).set({ refundedAgorot: sql`${order.refundedAgorot} + ${succeeded}` }).where(eq(order.id, orderId));
    // Anything not given back leaves the order waiting for a refund, which a manager can retry.
    if (failed || left > 0) return { ok: false, problem: { key: "REFUND_FAILED" } };

    const full = o.refundedAgorot + succeeded >= (o.capturedAgorot ?? 0);
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

/**
 * Where a delivered order's money can come back from, and how much each still holds. A captured J5 hold is a
 * new transaction at PayPlus, so the main refund goes to the capture; each approved extra is its own charge.
 */
async function refundSources(tx: Tx, o: typeof order.$inferSelect) {
  const intents = await tx.select().from(paymentIntent).where(eq(paymentIntent.orderId, o.id));
  const refunds = await tx.select().from(paymentRefund).where(and(inArray(paymentRefund.paymentIntentId, intents.map((i) => i.id).concat("00000000-0000-0000-0000-000000000000")), eq(paymentRefund.status, "SUCCEEDED")));
  const refundedOn = (intentId: string) =>
    refunds.filter((r) => r.paymentIntentId === intentId && !r.idempotencyKey.endsWith(":settle-refund")).reduce((sum, r) => sum + r.amountAgorot, 0);

  const sources: Array<{ intentId: string; ref: string; remaining: number }> = [];
  const main = intents.find((i) => i.purpose !== "EXTRA" && i.status === "AUTHORIZED" && i.providerTransactionRef);
  if (main) {
    const [capture] = await tx
      .select({ ref: paymentCapture.providerCaptureRef })
      .from(paymentCapture)
      .where(and(eq(paymentCapture.paymentIntentId, main.id), eq(paymentCapture.status, "SUCCEEDED")));
    const mainCharged = (o.capturedAgorot ?? 0) - o.extraChargedAgorot;
    sources.push({ intentId: main.id, ref: capture?.ref ?? main.providerTransactionRef!, remaining: mainCharged - refundedOn(main.id) });
  }
  for (const extra of intents.filter((i) => i.purpose === "EXTRA" && i.status === "AUTHORIZED" && i.providerTransactionRef)) {
    sources.push({ intentId: extra.id, ref: extra.providerTransactionRef!, remaining: extra.amountAgorot - refundedOn(extra.id) });
  }
  return sources;
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

  return db.transaction(async (tx): Promise<DeliveryResult> => {
    // The order row stays locked from the state check to the event: weighing can't finish and charge in between.
    const [o] = await tx.select().from(order).where(eq(order.id, orderId)).for("update");
    if (!o) return { ok: false, problem: { key: "NOT_FOUND" } };
    const check = transition(o.status as OrderStatus, event, { actor: staff.role as StaffRole, reason });
    if (!check.ok) return { ok: false, problem: rejection(check.reason) };

    // Everything the card paid comes back before the order is cancelled; if a refund fails, nothing is cancelled.
    let refunded = 0;
    if (decision === "CANCEL") {
      refunded = (await returnPayments(tx, provider, { orderId, reasonKey: reason.trim(), staffId: staff.id })).refundedAgorot;
    }

    const moved = await applyOrderEvent(tx, {
      orderId,
      event,
      ctx: { actor: staff.role as StaffRole, reason },
      actorId: staff.id,
      appUrl,
      now,
      payload: {
        templateVars: { reason, refundAmount: formatAgorot(agorot(refunded), o.locale === "en" ? "en" : "he") },
        ...(refunded > 0 && { templateOverrides: { "order.cancelled_by_shop": "order.cancelled_by_shop_refunded" } }),
      },
    });
    if (!moved.ok) return { ok: false, problem: rejection(moved.reason) };
    if (decision === "FORCE_DISPATCH") await tx.update(order).set({ unpaidDispatch: true }).where(eq(order.id, orderId));
    return { ok: true };
  }).catch((e) => {
    if (e instanceof PaymentReturnFailed) return { ok: false as const, problem: { key: "REFUND_FAILED" as const } };
    throw e;
  });
}

function rejection(reason: string): DeliveryProblem {
  return reason === "REASON_REQUIRED" ? { key: "REASON_REQUIRED" } : reason === "NOT_PERMITTED" ? { key: "NOT_PERMITTED" } : { key: "WRONG_STATE", reason };
}
