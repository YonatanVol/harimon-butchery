import { timingSafeEqual } from "node:crypto";
import { and, asc, eq, gt, isNotNull, lt, lte, ne, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { can, type StaffRole } from "@/domain/auth/permissions";
import { slotAvailability } from "@/domain/delivery/slots";
import { agorot } from "@/domain/money/agorot";
import { formatAgorot } from "@/domain/money/format";
import type { ActorRole } from "@/domain/order/machine";
import type { PaymentProvider } from "@/domain/payments/provider";
import { grams } from "@/domain/weight/grams";
import { priceForWeight } from "@/domain/weight/reprice";
import type * as schema from "../db/schema";
import { auditEvent, deliverySlot, deliveryZone, order, orderLine, paymentIntent, setting } from "../db/schema";
import { type OrderStatus, transition } from "@/domain/order/machine";
import { applyOrderEvent, notifyAboutOrder } from "./events";
import { returnPayments } from "./returnPayments";

type Database = PostgresJsDatabase<typeof schema>;

export type CustomerProblem =
  | { key: "NOT_FOUND" }
  | { key: "NOT_ALLOWED_NOW" }
  | { key: "DEADLINE_PASSED" }
  | { key: "EXTRA_CHARGE_FAILED" }
  | { key: "SLOT_UNAVAILABLE" }
  | { key: "COLD_CHAIN_EXCEEDED" }
  | { key: "REFUND_FAILED" };

export type CustomerResult<T = object> = ({ ok: true } & T) | { ok: false; problem: CustomerProblem };

async function findByToken(db: Database, orderNumber: string, token: string) {
  const [o] = await db.select().from(order).where(eq(order.orderNumber, orderNumber));
  if (!o) return null;
  const a = Buffer.from(o.accessToken);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b) ? o : null;
}

/** Deadlines pass whether or not anyone is looking: settle any that have, before showing an order. */
export async function expireApprovals(db: Database, { appUrl, now = new Date() }: { appUrl: string; now?: Date }) {
  const due = await db
    .select({ id: order.id })
    .from(order)
    .where(and(eq(order.status, "AWAITING_CUSTOMER_APPROVAL"), isNotNull(order.approvalDeadlineAt), lt(order.approvalDeadlineAt, now)));
  for (const o of due) {
    await db.transaction((tx) => applyOrderEvent(tx, { orderId: o.id, event: "APPROVAL_DEADLINE_PASSED", ctx: { actor: "SYSTEM" }, reasonKey: "DEADLINE", appUrl, now }));
  }
  return due.length;
}

export async function decideExtra(
  db: Database,
  provider: PaymentProvider,
  input: { orderNumber: string; token: string; decision: "APPROVE" | "TRIM"; appUrl: string; now?: Date },
): Promise<CustomerResult<{ outcome: "APPROVED" | "TRIMMED" }>> {
  const now = input.now ?? new Date();
  const found = await findByToken(db, input.orderNumber, input.token);
  if (!found) return { ok: false, problem: { key: "NOT_FOUND" } };

  // One transaction holds the order row from the status check through the card charge to the record. A second
  // click, the deadline sweep or the tablet's poll waits here, then finds the question already answered —
  // so the extra can't be charged twice, nor charged after the order has moved on.
  return db.transaction(async (tx): Promise<CustomerResult<{ outcome: "APPROVED" | "TRIMMED" }>> => {
    const [o] = await tx.select().from(order).where(eq(order.id, found.id)).for("update");
    if (o.status !== "AWAITING_CUSTOMER_APPROVAL") return { ok: false, problem: { key: "NOT_ALLOWED_NOW" } };
    if (o.approvalDeadlineAt && o.approvalDeadlineAt < now) {
      await applyOrderEvent(tx, { orderId: o.id, event: "APPROVAL_DEADLINE_PASSED", ctx: { actor: "SYSTEM" }, reasonKey: "DEADLINE", appUrl: input.appUrl, now });
      return { ok: false, problem: { key: "DEADLINE_PASSED" } };
    }

    const trim = (reasonKey: string) =>
      applyOrderEvent(tx, { orderId: o.id, event: "CUSTOMER_DECLINED_EXTRA", ctx: { actor: "CUSTOMER" }, reasonKey, appUrl: input.appUrl, now });

    if (input.decision === "TRIM") {
      return (await trim("CUSTOMER_CHOSE_TRIM")).ok ? { ok: true, outcome: "TRIMMED" } : { ok: false, problem: { key: "NOT_ALLOWED_NOW" } };
    }

    const [line] = await tx.select().from(orderLine).where(and(eq(orderLine.orderId, o.id), isNotNull(orderLine.pendingActualG)));
    const [intent] = await tx
      .select()
      .from(paymentIntent)
      .where(and(eq(paymentIntent.orderId, o.id), eq(paymentIntent.status, "AUTHORIZED"), ne(paymentIntent.purpose, "EXTRA")));
    if (!line || !intent?.tokenRef) return { ok: false, problem: { key: "NOT_ALLOWED_NOW" } };

    const price = agorot(line.pricePerKgAgorot!);
    const newLinePrice = priceForWeight(price, grams(line.pendingActualG!));
    const extra = newLinePrice - line.ceilingAgorot;

    const charged = await provider.chargeToken({ tokenRef: intent.tokenRef, amountAgorot: extra, idempotencyKey: `order:${o.id}:extra:${line.id}`, orderNumber: o.orderNumber });
    if (!charged.ok) {
      await trim("EXTRA_CHARGE_FAILED");
      return { ok: false, problem: { key: "EXTRA_CHARGE_FAILED" } };
    }

    await tx.insert(paymentIntent).values({
      orderId: o.id,
      provider: provider.name,
      sandbox: provider.sandbox,
      purpose: "EXTRA",
      amountAgorot: extra,
      status: "AUTHORIZED",
      providerTransactionRef: charged.transactionRef,
      cardBrand: intent.cardBrand,
      cardLast4: intent.cardLast4,
      authorizedAt: now,
    });
    await tx
      .update(orderLine)
      .set({ actualG: line.pendingActualG, pendingActualG: null, ceilingAgorot: newLinePrice, finalAgorot: newLinePrice, status: "WEIGHED", weighedAt: now })
      .where(eq(orderLine.id, line.id));
    await tx
      .update(order)
      .set({
        authorizationCeilingAgorot: sql`${order.authorizationCeilingAgorot} + ${extra}`,
        extraChargedAgorot: sql`${order.extraChargedAgorot} + ${extra}`,
        approvalDeadlineAt: null,
      })
      .where(eq(order.id, o.id));
    const moved = await applyOrderEvent(tx, {
      orderId: o.id,
      event: "CUSTOMER_APPROVED_EXTRA",
      ctx: { actor: "CUSTOMER" },
      appUrl: input.appUrl,
      now,
      payload: { templateVars: { extraAmount: formatAgorot(agorot(extra), o.locale === "en" ? "en" : "he"), productName: o.locale === "en" ? line.productNameEn : line.productNameHe } },
    });
    // Unreachable while the row is locked and the status was checked above; if it ever happens, fail loudly
    // (the charge key is per line, so a retry of the same approval cannot charge again).
    if (!moved.ok) throw new Error(`CUSTOMER_APPROVED_EXTRA rejected: ${moved.reason}`);
    return { ok: true, outcome: "APPROVED" };
  });
}

export async function cancelByCustomer(
  db: Database,
  provider: PaymentProvider,
  input: { orderNumber: string; token: string; appUrl: string; now?: Date },
): Promise<CustomerResult> {
  const o = await findByToken(db, input.orderNumber, input.token);
  if (!o) return { ok: false, problem: { key: "NOT_FOUND" } };
  return db.transaction(async (tx): Promise<CustomerResult> => {
    // Locked first: the butcher can't start picking, nor a second click cancel again, while money is returned.
    const [locked] = await tx.select().from(order).where(eq(order.id, o.id)).for("update");
    if (!transition(locked.status as OrderStatus, "CANCELLED_BY_CUSTOMER", { actor: "CUSTOMER" }).ok) return { ok: false, problem: { key: "NOT_ALLOWED_NOW" } };
    const returned = await returnPayments(tx, provider, { orderId: o.id, reasonKey: "CANCELLED_BY_CUSTOMER", staffId: null });
    if (!returned.ok) return { ok: false, problem: { key: "REFUND_FAILED" } };
    const moved = await applyOrderEvent(tx, {
      orderId: o.id,
      event: "CANCELLED_BY_CUSTOMER",
      ctx: { actor: "CUSTOMER" },
      appUrl: input.appUrl,
      now: input.now,
      payload: {
        templateVars: { refundAmount: formatAgorot(agorot(returned.refundedAgorot), o.locale === "en" ? "en" : "he") },
        ...(returned.refundedAgorot > 0 && { templateOverrides: { "order.cancelled": "order.cancelled_refunded" } }),
      },
    });
    return moved.ok ? { ok: true } : { ok: false, problem: { key: "NOT_ALLOWED_NOW" } };
  });
}

async function coldChainMaxHours(db: Database) {
  const [cold] = await db.select().from(setting).where(eq(setting.key, "delivery.coldChainMaxHours"));
  return Number(cold?.value ?? 6);
}

/**
 * Windows an order can move to: same zone, open, with room, and — once the meat has been cut — ending
 * within the cold-chain limit counted from then. Never the window it is in now.
 * `cutAt` null means nothing is cut yet, so any upcoming window will do.
 */
export async function rescheduleOptions(db: Database, o: { zoneId: string; slotId: string | null; cutAt: Date | null }, now = new Date()) {
  const maxHours = await coldChainMaxHours(db);
  const latestEnd = o.cutAt ? new Date(o.cutAt.getTime() + maxHours * 3_600_000) : null;
  return db
    .select({ id: deliverySlot.id, startsAt: deliverySlot.startsAt, endsAt: deliverySlot.endsAt })
    .from(deliverySlot)
    .where(
      and(
        eq(deliverySlot.zoneId, o.zoneId),
        eq(deliverySlot.status, "OPEN"),
        gt(deliverySlot.cutoffAt, now),
        lt(deliverySlot.reservedOrders, deliverySlot.capacityOrders),
        latestEnd ? lte(deliverySlot.endsAt, latestEnd) : undefined,
        o.slotId ? ne(deliverySlot.id, o.slotId) : undefined,
      ),
    )
    .orderBy(asc(deliverySlot.startsAt))
    .limit(12);
}

const BEFORE_DISPATCH = ["AUTHORIZED", "PICKING", "AWAITING_CUSTOMER_APPROVAL", "WEIGHED", "REPRICED", "CAPTURE_PENDING", "CAPTURED", "CAPTURE_FAILED", "PACKED"];

/**
 * A manager moves an order that hasn't left the shop to another window (its window was closed, or the
 * customer called). Not a status change: the reservation moves, the log records it, the customer is told.
 */
export async function changeWindow(
  db: Database,
  input: { orderId: string; slotId: string; staff: { id: string; role: string }; appUrl: string; now?: Date },
): Promise<CustomerResult | { ok: false; problem: { key: "NOT_PERMITTED" } }> {
  const now = input.now ?? new Date();
  if (!can(input.staff.role as StaffRole, "OVERRIDE")) return { ok: false, problem: { key: "NOT_PERMITTED" } };
  const maxHours = await coldChainMaxHours(db);
  try {
    await db.transaction(async (tx) => {
      const [locked] = await tx.select().from(order).where(eq(order.id, input.orderId)).for("update");
      if (!locked) throw new Error("NOT_FOUND");
      if (!BEFORE_DISPATCH.includes(locked.status)) throw new Error("NOT_ALLOWED_NOW");
      const [slot] = await tx.select().from(deliverySlot).where(eq(deliverySlot.id, input.slotId)).for("update");
      if (!slot || slot.zoneId !== locked.zoneId || slot.id === locked.slotId || slot.status !== "OPEN" || slot.cutoffAt <= now || slot.reservedOrders >= slot.capacityOrders) {
        throw new Error("SLOT_UNAVAILABLE");
      }
      const cutAt = locked.weighedAt ?? locked.capturedAt;
      if (cutAt && slot.endsAt.getTime() - cutAt.getTime() > maxHours * 3_600_000) throw new Error("COLD_CHAIN_EXCEEDED");

      if (locked.slotId) {
        await tx
          .update(deliverySlot)
          .set({ reservedOrders: sql`greatest(${deliverySlot.reservedOrders} - 1, 0)`, reservedWeightG: sql`greatest(${deliverySlot.reservedWeightG} - ${locked.reservedWeightG}, 0)` })
          .where(eq(deliverySlot.id, locked.slotId));
      }
      await tx
        .update(deliverySlot)
        .set({ reservedOrders: sql`${deliverySlot.reservedOrders} + 1`, reservedWeightG: sql`${deliverySlot.reservedWeightG} + ${locked.reservedWeightG}` })
        .where(eq(deliverySlot.id, slot.id));
      await tx.update(order).set({ slotId: slot.id }).where(eq(order.id, locked.id));
      await tx.insert(auditEvent).values({ actorType: "STAFF", actorId: input.staff.id, entityType: "order", entityId: locked.id, action: "order.change_window", before: { slotId: locked.slotId }, after: { slotId: slot.id } });
      await notifyAboutOrder(tx, { orderId: locked.id, key: "order.rescheduled", appUrl: input.appUrl, now });
    });
  } catch (e) {
    const key = (e as Error).message;
    if (key === "NOT_FOUND" || key === "SLOT_UNAVAILABLE" || key === "COLD_CHAIN_EXCEEDED" || key === "NOT_ALLOWED_NOW") return { ok: false, problem: { key } };
    throw e;
  }
  return { ok: true };
}

export async function rescheduleDelivery(
  db: Database,
  input: { orderNumber: string; token: string; slotId: string; appUrl: string; now?: Date },
): Promise<CustomerResult> {
  const o = await findByToken(db, input.orderNumber, input.token);
  if (!o) return { ok: false, problem: { key: "NOT_FOUND" } };
  return moveDelivery(db, { orderId: o.id, slotId: input.slotId, actor: "CUSTOMER", appUrl: input.appUrl, now: input.now });
}

/** Move a not-home order to another window — by the customer from their link, or by a manager on the phone with them. */
export async function moveDelivery(
  db: Database,
  input: { orderId: string; slotId: string; actor: ActorRole; actorId?: string; appUrl: string; now?: Date },
): Promise<CustomerResult> {
  const now = input.now ?? new Date();
  const maxHours = await coldChainMaxHours(db);

  try {
    await db.transaction(async (tx) => {
      const [locked] = await tx.select().from(order).where(eq(order.id, input.orderId)).for("update");
      if (!locked) throw new Error("NOT_FOUND");
      const [slot] = await tx.select().from(deliverySlot).where(eq(deliverySlot.id, input.slotId)).for("update");
      const [zone] = await tx.select().from(deliveryZone).where(eq(deliveryZone.id, locked.zoneId));
      if (!slot || slot.zoneId !== locked.zoneId || slot.id === locked.slotId) throw new Error("SLOT_UNAVAILABLE");
      const state = slotAvailability(
        { status: slot.status, startsAt: slot.startsAt, cutoffAt: slot.cutoffAt, capacityOrders: slot.capacityOrders, reservedOrders: slot.reservedOrders, activeHolds: 0, reasonHe: null, reasonEn: null },
        now,
        Math.min(zone.leadTimeMinutes, 60),
      );
      if (state.kind !== "AVAILABLE") throw new Error("SLOT_UNAVAILABLE");

      // Measured to the end of the new window: that is the latest the meat reaches the customer.
      const hoursSinceCapture = locked.capturedAt ? (slot.endsAt.getTime() - locked.capturedAt.getTime()) / 3_600_000 : null;
      if (locked.slotId) {
        await tx
          .update(deliverySlot)
          .set({ reservedOrders: sql`greatest(${deliverySlot.reservedOrders} - 1, 0)`, reservedWeightG: sql`greatest(${deliverySlot.reservedWeightG} - ${locked.reservedWeightG}, 0)` })
          .where(eq(deliverySlot.id, locked.slotId));
      }
      await tx
        .update(deliverySlot)
        .set({ reservedOrders: sql`${deliverySlot.reservedOrders} + 1`, reservedWeightG: sql`${deliverySlot.reservedWeightG} + ${locked.reservedWeightG}` })
        .where(eq(deliverySlot.id, slot.id));
      await tx.update(order).set({ slotId: slot.id }).where(eq(order.id, locked.id));
      // Applied last so the message to the customer names the new window.
      const moved = await applyOrderEvent(tx, {
        orderId: locked.id,
        event: "RESCHEDULED",
        ctx: { actor: input.actor, hoursSinceCapture, coldChainMaxHours: maxHours },
        actorId: input.actorId,
        appUrl: input.appUrl,
        now,
        payload: { fromSlotId: locked.slotId, toSlotId: slot.id },
      });
      if (!moved.ok) throw new Error(moved.reason === "COLD_CHAIN_EXCEEDED" ? "COLD_CHAIN_EXCEEDED" : "NOT_ALLOWED_NOW");
    });
  } catch (e) {
    const key = (e as Error).message;
    if (key === "NOT_FOUND" || key === "SLOT_UNAVAILABLE" || key === "COLD_CHAIN_EXCEEDED" || key === "NOT_ALLOWED_NOW") return { ok: false, problem: { key } };
    throw e;
  }
  return { ok: true };
}
