import { asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client";
import { customer, deliverySlot, deliveryZone, invoice, kashrutAuthority, order, orderLine, productKashrut, productVariant } from "../db/schema";

/** Everything the three printouts need for one order: pick sheet, package label, delivery note. */
export async function loadPrintOrder(id: string) {
  if (!z.string().uuid().safeParse(id).success) return null;
  const [row] = await db
    .select({ order, customer, slot: deliverySlot, zone: deliveryZone, invoice })
    .from(order)
    .innerJoin(customer, eq(customer.id, order.customerId))
    .innerJoin(deliveryZone, eq(deliveryZone.id, order.zoneId))
    .leftJoin(deliverySlot, eq(deliverySlot.id, order.slotId))
    .leftJoin(invoice, eq(invoice.orderId, order.id))
    .where(eq(order.id, id));
  if (!row) return null;

  const lines = await db
    .select({ line: orderLine, productId: productVariant.productId })
    .from(orderLine)
    .innerJoin(productVariant, eq(productVariant.id, orderLine.variantId))
    .where(eq(orderLine.orderId, id))
    .orderBy(asc(orderLine.sortOrder));

  const productIds = [...new Set(lines.map((l) => l.productId))];
  const authorities = productIds.length
    ? await db
        .selectDistinct({ nameHe: kashrutAuthority.nameHe, nameEn: kashrutAuthority.nameEn, certificateNumber: kashrutAuthority.certificateNumber, isFictional: kashrutAuthority.isFictional })
        .from(productKashrut)
        .innerJoin(kashrutAuthority, eq(kashrutAuthority.id, productKashrut.authorityId))
        .where(inArray(productKashrut.productId, productIds))
    : [];

  return { ...row, lines: lines.map((l) => l.line), authorities };
}
