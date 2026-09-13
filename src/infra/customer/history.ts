import { desc, eq, sql } from "drizzle-orm";
import { db } from "../db/client";
import { customer, deliverySlot, order } from "../db/schema";

/** Every order placed with this phone, newest first. */
export async function loadOrderHistory(phoneE164: string) {
  return db
    .select({
      orderNumber: order.orderNumber,
      accessToken: order.accessToken,
      status: order.status,
      createdAt: order.createdAt,
      estimateTotalAgorot: order.estimateTotalAgorot,
      authorizationCeilingAgorot: order.authorizationCeilingAgorot,
      capturedAgorot: order.capturedAgorot,
      refundedAgorot: order.refundedAgorot,
      startsAt: deliverySlot.startsAt,
      endsAt: deliverySlot.endsAt,
      firstName: customer.firstName,
      lineCount: sql<number>`(select count(*)::int from order_line ol where ol.order_id = orders.id)`,
    })
    .from(order)
    .innerJoin(customer, eq(customer.id, order.customerId))
    .leftJoin(deliverySlot, eq(deliverySlot.id, order.slotId))
    .where(eq(customer.phoneE164, phoneE164))
    .orderBy(desc(order.createdAt))
    .limit(100);
}
