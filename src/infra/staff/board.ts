import "server-only";
import { and, asc, eq, gt, inArray, isNotNull, lt, lte, ne, sql } from "drizzle-orm";
import type { OrderStatus } from "@/domain/order/machine";
import { db } from "../db/client";
import { customer, deliverySlot, deliveryZone, kashrutAuthority, order, orderLine, paymentIntent } from "../db/schema";

export const BOARD_COLUMNS: Record<"toPrepare" | "inProgress" | "ready" | "onTheWay", OrderStatus[]> = {
  toPrepare: ["AUTHORIZED"],
  inProgress: ["PICKING", "AWAITING_CUSTOMER_APPROVAL", "WEIGHED", "REPRICED", "CAPTURE_PENDING", "CAPTURE_FAILED"],
  ready: ["CAPTURED", "PACKED"],
  onTheWay: ["OUT_FOR_DELIVERY", "DELIVERY_FAILED_NOT_HOME", "RESCHEDULED"],
};

const BOARD_STATUSES = Object.values(BOARD_COLUMNS).flat();

export async function loadBoard(serviceDate: string) {
  const rows = await db
    .select({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      firstName: customer.firstName,
      lastName: customer.lastName,
      zoneHe: deliveryZone.nameHe,
      zoneEn: deliveryZone.nameEn,
      startsAt: deliverySlot.startsAt,
      endsAt: deliverySlot.endsAt,
      hold: order.authorizationCeilingAgorot,
      captured: order.capturedAgorot,
      unpaidDispatch: order.unpaidDispatch,
      lineCount: sql<number>`(select count(*)::int from ${orderLine} where ${orderLine.orderId} = ${order.id})`,
      weightG: order.reservedWeightG,
    })
    .from(order)
    .innerJoin(customer, eq(customer.id, order.customerId))
    .innerJoin(deliveryZone, eq(deliveryZone.id, order.zoneId))
    .innerJoin(deliverySlot, eq(deliverySlot.id, order.slotId))
    .where(and(eq(deliverySlot.serviceDate, serviceDate), inArray(order.status, BOARD_STATUSES)))
    .orderBy(asc(deliverySlot.startsAt), asc(order.placedAt));

  const slots = await db
    .select({
      id: deliverySlot.id,
      zoneHe: deliveryZone.nameHe,
      zoneEn: deliveryZone.nameEn,
      startsAt: deliverySlot.startsAt,
      endsAt: deliverySlot.endsAt,
      reservedOrders: deliverySlot.reservedOrders,
      capacityOrders: deliverySlot.capacityOrders,
      reservedWeightG: deliverySlot.reservedWeightG,
    })
    .from(deliverySlot)
    .innerJoin(deliveryZone, eq(deliveryZone.id, deliverySlot.zoneId))
    .where(and(eq(deliverySlot.serviceDate, serviceDate), gt(deliverySlot.reservedOrders, 0)))
    .orderBy(asc(deliverySlot.startsAt));

  return { rows, slots };
}

export type BoardAlert =
  | { key: "CAPTURE_FAILED" | "AUTH_EXPIRED" | "AWAITING_CUSTOMER" | "NOT_HOME" | "NEEDS_REFUND"; orderId: string; orderNumber: string }
  | { key: "HOLD_EXPIRING" | "SLOT_SOON" | "WINDOW_CLOSED"; orderId: string; orderNumber: string; when: Date }
  | { key: "CERT_EXPIRING"; authorityHe: string; authorityEn: string; when: Date };

/** Only what genuinely needs a decision. An empty list means the strip does not render at all. */
export async function loadAlerts(now = new Date()): Promise<BoardAlert[]> {
  const alerts: BoardAlert[] = [];

  const stuck = await db
    .select({ id: order.id, orderNumber: order.orderNumber, status: order.status, authorizedAt: order.authorizedAt })
    .from(order)
    .where(inArray(order.status, ["CAPTURE_FAILED", "AUTH_EXPIRED", "AWAITING_CUSTOMER_APPROVAL", "DELIVERY_FAILED_NOT_HOME", "RETURNED_TO_SHOP", "REFUND_PENDING"]));
  for (const o of stuck) {
    if (o.status === "CAPTURE_FAILED") alerts.push({ key: "CAPTURE_FAILED", orderId: o.id, orderNumber: o.orderNumber });
    else if (o.status === "AWAITING_CUSTOMER_APPROVAL") alerts.push({ key: "AWAITING_CUSTOMER", orderId: o.id, orderNumber: o.orderNumber });
    // The customer is told someone will call; this row is that promise on the shop's side.
    else if (o.status === "DELIVERY_FAILED_NOT_HOME") alerts.push({ key: "NOT_HOME", orderId: o.id, orderNumber: o.orderNumber });
    else if (o.status === "RETURNED_TO_SHOP" || o.status === "REFUND_PENDING") alerts.push({ key: "NEEDS_REFUND", orderId: o.id, orderNumber: o.orderNumber });
    else if (o.authorizedAt) alerts.push({ key: "AUTH_EXPIRED", orderId: o.id, orderNumber: o.orderNumber });
  }

  const expiring = await db
    .select({ id: order.id, orderNumber: order.orderNumber, expiresAt: paymentIntent.expiresAt })
    .from(order)
    .innerJoin(paymentIntent, and(eq(paymentIntent.orderId, order.id), eq(paymentIntent.status, "AUTHORIZED")))
    .where(
      and(
        inArray(order.status, ["AUTHORIZED", "PICKING", "WEIGHED", "REPRICED"]),
        isNotNull(paymentIntent.expiresAt),
        lt(paymentIntent.expiresAt, new Date(now.getTime() + 24 * 3_600_000)),
      ),
    );
  for (const o of expiring) alerts.push({ key: "HOLD_EXPIRING", orderId: o.id, orderNumber: o.orderNumber, when: o.expiresAt! });

  const soon = await db
    .select({ id: order.id, orderNumber: order.orderNumber, startsAt: deliverySlot.startsAt })
    .from(order)
    .innerJoin(deliverySlot, eq(deliverySlot.id, order.slotId))
    .where(
      and(
        inArray(order.status, ["AUTHORIZED", "PICKING", "AWAITING_CUSTOMER_APPROVAL", "WEIGHED", "REPRICED", "CAPTURE_PENDING", "CAPTURED"]),
        lte(deliverySlot.startsAt, new Date(now.getTime() + 60 * 60_000)),
        gt(deliverySlot.endsAt, now),
      ),
    );
  for (const o of soon) alerts.push({ key: "SLOT_SOON", orderId: o.id, orderNumber: o.orderNumber, when: o.startsAt });

  // A window closed after an order was booked into it (a manual closure): someone has to call the customer.
  const stranded = await db
    .select({ id: order.id, orderNumber: order.orderNumber, startsAt: deliverySlot.startsAt })
    .from(order)
    .innerJoin(deliverySlot, eq(deliverySlot.id, order.slotId))
    .where(
      and(
        inArray(order.status, ["AUTHORIZED", "PICKING", "AWAITING_CUSTOMER_APPROVAL", "WEIGHED", "REPRICED", "CAPTURE_PENDING", "CAPTURED", "CAPTURE_FAILED", "PACKED", "RESCHEDULED"]),
        ne(deliverySlot.status, "OPEN"),
        gt(deliverySlot.endsAt, now),
      ),
    );
  for (const o of stranded) alerts.push({ key: "WINDOW_CLOSED", orderId: o.id, orderNumber: o.orderNumber, when: o.startsAt });

  const certs = await db
    .select()
    .from(kashrutAuthority)
    .where(lt(kashrutAuthority.certificateValidUntil, new Date(now.getTime() + 30 * 86_400_000).toISOString().slice(0, 10)));
  for (const a of certs) alerts.push({ key: "CERT_EXPIRING", authorityHe: a.nameHe, authorityEn: a.nameEn, when: new Date(`${a.certificateValidUntil}T12:00:00Z`) });

  return alerts;
}
