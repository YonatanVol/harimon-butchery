import { timingSafeEqual } from "node:crypto";
import { and, asc, eq, gt, isNotNull, lt, lte, ne, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { slotAvailability } from "@/domain/delivery/slots";
import { agorot } from "@/domain/money/agorot";
import { formatAgorot } from "@/domain/money/format";
import type { ActorRole } from "@/domain/order/machine";
import type { PaymentProvider } from "@/domain/payments/provider";
import { grams } from "@/domain/weight/grams";
import { priceForWeight } from "@/domain/weight/reprice";
import type * as schema from "../db/schema";
import { deliverySlot, deliveryZone, order, orderLine, paymentIntent, setting } from "../db/schema";
import { applyOrderEvent } from "./events";

type Database = PostgresJsDatabase<typeof schema>;

export type CustomerProblem =
  | { key: "NOT_FOUND" }
  | { key: "NOT_ALLOWED_NOW" }
  | { key: "DEADLINE_PASSED" }
  | { key: "EXTRA_CHARGE_FAILED" }
  | { key: "SLOT_UNAVAILABLE" }
  | { key: "COLD_CHAIN_EXCEEDED" };

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
  const o = await findByToken(db, input.orderNumber, input.token);
  if (!o) return { ok: false, problem: { key: "NOT_FOUND" } };
  if (o.status !== "AWAITING_CUSTOMER_APPROVAL") return { ok: false, problem: { key: "NOT_ALLOWED_NOW" } };
  if (o.approvalDeadlineAt && o.approvalDeadlineAt < now) {
    await expireApprovals(db, { appUrl: input.appUrl, now });
    return { ok: false, problem: { key: "DEADLINE_PASSED" } };
  }

  const trim = async (reasonKey: string) => {
    const r = await db.transaction((tx) =>
      applyOrderEvent(tx, { orderId: o.id, event: "CUSTOMER_DECLINED_EXTRA", ctx: { actor: "CUSTOMER" }, reasonKey, appUrl: input.appUrl, now }),
    );
    return r.ok;
  };

  if (input.decision === "TRIM") {
    return (await trim("CUSTOMER_CHOSE_TRIM")) ? { ok: true, outcome: "TRIMMED" } : { ok: false, problem: { key: "NOT_ALLOWED_NOW" } };
  }

  const [line] = await db.select().from(orderLine).where(and(eq(orderLine.orderId, o.id), isNotNull(orderLine.pendingActualG)));
  const [intent] = await db
    .select()
    .from(paymentIntent)
    .where(and(eq(paymentIntent.orderId, o.id), eq(paymentIntent.status, "AUTHORIZED"), ne(paymentIntent.purpose, "EXTRA")));
  if (!line || !intent?.tokenRef) return { ok: false, problem: { key: "NOT_ALLOWED_NOW" } };

  const price = agorot(line.pricePerKgAgorot!);
  const newLinePrice = priceForWeight(price, grams(line.pendingActualG!));
  const extra = newLinePrice - line.ceilingAgorot;

  // Charge first, record after: a failed charge must never leave an "approved" order behind.
  const charged = await provider.chargeToken({ tokenRef: intent.tokenRef, amountAgorot: extra, idempotencyKey: `order:${o.id}:extra:${line.id}`, orderNumber: o.orderNumber });
  if (!charged.ok) {
    await trim("EXTRA_CHARGE_FAILED");
    return { ok: false, problem: { key: "EXTRA_CHARGE_FAILED" } };
  }

  await db.transaction(async (tx) => {
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
    const r = await applyOrderEvent(tx, {
      orderId: o.id,
      event: "CUSTOMER_APPROVED_EXTRA",
      ctx: { actor: "CUSTOMER" },
      appUrl: input.appUrl,
      now,
      payload: { templateVars: { extraAmount: formatAgorot(agorot(extra), o.locale === "en" ? "en" : "he"), productName: o.locale === "en" ? line.productNameEn : line.productNameHe } },
    });
    if (!r.ok) throw new Error(`CUSTOMER_APPROVED_EXTRA rejected: ${r.reason}`);
  });
  return { ok: true, outcome: "APPROVED" };
}

export async function cancelByCustomer(
  db: Database,
  provider: PaymentProvider,
  input: { orderNumber: string; token: string; appUrl: string; now?: Date },
): Promise<CustomerResult> {
  const o = await findByToken(db, input.orderNumber, input.token);
  if (!o) return { ok: false, problem: { key: "NOT_FOUND" } };
  const [intent] = await db.select().from(paymentIntent).where(and(eq(paymentIntent.orderId, o.id), eq(paymentIntent.status, "AUTHORIZED")));
  const moved = await db.transaction((tx) =>
    applyOrderEvent(tx, { orderId: o.id, event: "CANCELLED_BY_CUSTOMER", ctx: { actor: "CUSTOMER" }, appUrl: input.appUrl, now: input.now }),
  );
  if (!moved.ok) return { ok: false, problem: { key: "NOT_ALLOWED_NOW" } };
  if (intent?.providerTransactionRef && moved.effects.includes("VOID_AUTHORIZATION")) {
    await provider.voidAuthorization({ transactionRef: intent.providerTransactionRef });
    await db.update(paymentIntent).set({ status: "VOIDED" }).where(eq(paymentIntent.id, intent.id));
  }
  return { ok: true };
}

async function coldChainMaxHours(db: Database) {
  const [cold] = await db.select().from(setting).where(eq(setting.key, "delivery.coldChainMaxHours"));
  return Number(cold?.value ?? 6);
}

/**
 * Windows a customer who wasn't home can move to: same zone, open, and ending within the cold-chain
 * limit counted from packing — never the window that just failed. The same rule is enforced on submit.
 */
export async function rescheduleOptions(db: Database, o: { zoneId: string; slotId: string | null; capturedAt: Date | null }, now = new Date()) {
  const maxHours = await coldChainMaxHours(db);
  const latestEnd = new Date((o.capturedAt ?? now).getTime() + maxHours * 3_600_000);
  return db
    .select({ id: deliverySlot.id, startsAt: deliverySlot.startsAt, endsAt: deliverySlot.endsAt })
    .from(deliverySlot)
    .where(
      and(
        eq(deliverySlot.zoneId, o.zoneId),
        eq(deliverySlot.status, "OPEN"),
        gt(deliverySlot.cutoffAt, now),
        lt(deliverySlot.reservedOrders, deliverySlot.capacityOrders),
        lte(deliverySlot.endsAt, latestEnd),
        o.slotId ? ne(deliverySlot.id, o.slotId) : undefined,
      ),
    )
    .orderBy(asc(deliverySlot.startsAt))
    .limit(8);
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
