import { and, desc, eq, inArray, like, lt, or, type SQL, sql } from "drizzle-orm";
import { db } from "../db/client";
import { auditEvent, deliveryZone, order, orderLine, product, staffUser } from "../db/schema";

export const AUDIT_GROUPS = {
  money: ["REFUND_REQUESTED", "FORCE_DISPATCHED", "SAVED_CARD_CHARGED", "CAPTURE_FAILED", "GIVE_EXTRA_FREE", "product.price"],
  orders: ["CANCELLED_BY_SHOP", "REFUSED", "RETURNED_TO_SHOP", "order.change_window", "line.%", "delivery.%"],
  catalog: ["product.price", "product.publish", "product.unpublish"],
  stock: ["stock.%"],
  delivery: ["zone.update", "blackout.add", "blackout.remove", "slots.generate"],
  reviews: ["review.%"],
} as const;
export type AuditGroup = keyof typeof AUDIT_GROUPS;

/** The log, newest first, with names instead of ids: who did what to which product, order or zone. */
export async function loadAudit({ group, before, limit = 100 }: { group: AuditGroup | null; before: Date | null; limit?: number }) {
  const filters: SQL[] = [];
  if (group) {
    const patterns = AUDIT_GROUPS[group] as readonly string[];
    filters.push(or(...patterns.map((p) => (p.includes("%") ? like(auditEvent.action, p) : eq(auditEvent.action, p))))!);
  }
  if (before) filters.push(lt(auditEvent.createdAt, before));

  const rows = await db
    .select({ event: auditEvent, staffHe: staffUser.fullNameHe, staffEn: staffUser.fullNameEn })
    .from(auditEvent)
    .leftJoin(staffUser, eq(staffUser.id, auditEvent.actorId))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(auditEvent.createdAt), desc(auditEvent.id))
    .limit(limit + 1);

  const ids = (type: string) => [...new Set(rows.filter((r) => r.event.entityType === type).map((r) => r.event.entityId))].filter((v) => /^[0-9a-f-]{36}$/.test(v));
  const [products, orders, lines, zones] = await Promise.all([
    ids("product").length ? db.select({ id: product.id, nameHe: product.nameHe, nameEn: product.nameEn }).from(product).where(inArray(product.id, ids("product"))) : [],
    ids("order").length ? db.select({ id: order.id, number: order.orderNumber }).from(order).where(inArray(order.id, ids("order"))) : [],
    ids("order_line").length
      ? db.select({ id: orderLine.id, orderId: order.id, number: order.orderNumber }).from(orderLine).innerJoin(order, eq(order.id, orderLine.orderId)).where(inArray(orderLine.id, ids("order_line")))
      : [],
    ids("delivery_zone").length ? db.select({ id: deliveryZone.id, nameHe: deliveryZone.nameHe, nameEn: deliveryZone.nameEn }).from(deliveryZone).where(inArray(deliveryZone.id, ids("delivery_zone"))) : [],
  ]);
  const productBy = new Map(products.map((p) => [p.id, p]));
  const orderBy = new Map(orders.map((o) => [o.id, o]));
  const lineBy = new Map(lines.map((l) => [l.id, l]));
  const zoneBy = new Map(zones.map((z) => [z.id, z]));

  const items = rows.slice(0, limit).map(({ event: e, staffHe, staffEn }) => {
    const line = e.entityType === "order_line" ? lineBy.get(e.entityId) : undefined;
    const ord = e.entityType === "order" ? orderBy.get(e.entityId) : line ? { id: line.orderId, number: line.number } : undefined;
    return {
      ...e,
      staffHe,
      staffEn,
      product: e.entityType === "product" ? (productBy.get(e.entityId) ?? null) : null,
      order: ord ?? null,
      zone: e.entityType === "delivery_zone" ? (zoneBy.get(e.entityId) ?? null) : null,
    };
  });
  return { items, next: rows.length > limit ? items[items.length - 1].createdAt : null };
}

export const auditCount = () => db.select({ n: sql<number>`count(*)::int` }).from(auditEvent);
