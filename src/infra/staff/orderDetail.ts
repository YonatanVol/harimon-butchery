import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client";
import {
  customer,
  deliverySlot,
  deliveryZone,
  notification,
  order,
  orderLine,
  orderStatusEvent,
  paymentCapture,
  paymentIntent,
  paymentRefund,
  staffUser,
} from "../db/schema";

export async function loadStaffOrder(id: string) {
  if (!z.string().uuid().safeParse(id).success) return null;
  const [row] = await db
    .select({ order, customer, slot: deliverySlot, zone: deliveryZone })
    .from(order)
    .innerJoin(customer, eq(customer.id, order.customerId))
    .innerJoin(deliveryZone, eq(deliveryZone.id, order.zoneId))
    .leftJoin(deliverySlot, eq(deliverySlot.id, order.slotId))
    .where(eq(order.id, id));
  if (!row) return null;

  const [lines, events, messages, intents] = await Promise.all([
    db.select().from(orderLine).where(eq(orderLine.orderId, id)).orderBy(asc(orderLine.sortOrder)),
    db
      .select({ event: orderStatusEvent, staffNameHe: staffUser.fullNameHe, staffNameEn: staffUser.fullNameEn })
      .from(orderStatusEvent)
      .leftJoin(staffUser, eq(staffUser.id, orderStatusEvent.actorId))
      .where(eq(orderStatusEvent.orderId, id))
      .orderBy(desc(orderStatusEvent.createdAt)),
    db.select().from(notification).where(eq(notification.orderId, id)).orderBy(desc(notification.queuedAt)),
    db.select().from(paymentIntent).where(eq(paymentIntent.orderId, id)).orderBy(asc(paymentIntent.createdAt)),
  ]);
  const intentIds = intents.map((i) => i.id);
  const [captures, refunds] = intentIds.length
    ? await Promise.all([
        db.select().from(paymentCapture).where(eq(paymentCapture.paymentIntentId, intentIds[intentIds.length - 1])),
        db.select().from(paymentRefund).where(eq(paymentRefund.paymentIntentId, intentIds[intentIds.length - 1])),
      ])
    : [[], []];

  return { ...row, lines, events, messages, intents, captures, refunds };
}
