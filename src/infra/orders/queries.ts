import "server-only";
import { timingSafeEqual } from "node:crypto";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "../db/client";
import { customer, deliverySlot, deliveryZone, order, orderLine, orderStatusEvent, paymentIntent, paymentRefund } from "../db/schema";

function sameToken(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** The customer's view of an order, reachable only with the unguessable token from their message. */
export async function loadTrackedOrder(orderNumber: string, token: string) {
  if (!/^\d{4}-\d{5}$/.test(orderNumber) || !token) return null;
  const [row] = await db
    .select({ order, customer, slot: deliverySlot, zone: deliveryZone })
    .from(order)
    .innerJoin(customer, eq(customer.id, order.customerId))
    .leftJoin(deliverySlot, eq(deliverySlot.id, order.slotId))
    .innerJoin(deliveryZone, eq(deliveryZone.id, order.zoneId))
    .where(eq(order.orderNumber, orderNumber));
  if (!row || !sameToken(row.order.accessToken, token)) return null;

  const [lines, events, intents] = await Promise.all([
    db.select().from(orderLine).where(eq(orderLine.orderId, row.order.id)).orderBy(asc(orderLine.sortOrder)),
    db.select().from(orderStatusEvent).where(eq(orderStatusEvent.orderId, row.order.id)).orderBy(asc(orderStatusEvent.createdAt), asc(orderStatusEvent.seq)),
    db.select().from(paymentIntent).where(eq(paymentIntent.orderId, row.order.id)).orderBy(desc(paymentIntent.createdAt)),
  ]);
  const refunds = intents.length
    ? await db.select().from(paymentRefund).where(and(inArray(paymentRefund.paymentIntentId, intents.map((i) => i.id)), eq(paymentRefund.status, "SUCCEEDED")))
    : [];
  // What a cancellation gave back (not the "not supplied" refunds made when a package order is weighed).
  const returnedOnCancelAgorot = refunds.filter((r) => r.idempotencyKey.includes(":cancel:")).reduce((sum, r) => sum + r.amountAgorot, 0);
  const hold = intents.find((i) => i.purpose === "AUTHORIZE");
  return {
    ...row,
    lines,
    events,
    intent: intents.find((i) => i.status === "AUTHORIZED") ?? intents[0] ?? null,
    returnedOnCancelAgorot,
    holdState: hold ? (hold.status === "VOIDED" ? ("RELEASED" as const) : hold.status === "AUTHORIZED" ? ("HELD" as const) : ("NONE" as const)) : ("NONE" as const),
  };
}
