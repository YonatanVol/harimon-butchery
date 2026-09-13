import { randomBytes } from "node:crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { formatIsraelTime, israelDateOf, toIsoDate } from "@/domain/delivery/israelTime";
import { agorot } from "@/domain/money/agorot";
import { formatAgorot } from "@/domain/money/format";
import { type TemplateKey, type TemplateVars, renderTemplate, templateParams } from "@/domain/notifications/templates";
import { type Effect, type OrderEvent, type TransitionContext, transition } from "@/domain/order/machine";
import type * as schema from "../db/schema";
import { auditEvent, cart, customer, deliverySlot, notification, order, orderLine, orderStatusEvent, productVariant, stockItem, stockMovement } from "../db/schema";
import { notifyBackInStock } from "../interest/signups";

type Database = PostgresJsDatabase<typeof schema>;
type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

const statusTimestamp: Partial<Record<string, keyof typeof order.$inferInsert>> = {
  AUTHORIZED: "authorizedAt",
  PICKING: "pickingStartedAt",
  WEIGHED: "weighedAt",
  CAPTURED: "capturedAt",
  PACKED: "packedAt",
  OUT_FOR_DELIVERY: "dispatchedAt",
  DELIVERED: "deliveredAt",
  CANCELLED_BY_CUSTOMER: "cancelledAt",
  CANCELLED_BY_SHOP: "cancelledAt",
};

export interface ApplyEventInput {
  orderId: string;
  event: OrderEvent;
  ctx: TransitionContext;
  actorId?: string | null;
  reasonKey?: string | null;
  payload?: Record<string, unknown>;
  appUrl: string;
  now?: Date;
}

export type ApplyEventResult =
  | { ok: true; from: string; to: string; effects: Effect[]; order: typeof order.$inferSelect }
  | { ok: false; reason: string };

const actorTypeOf = (actor: TransitionContext["actor"]) =>
  actor === "CUSTOMER" ? "CUSTOMER" : actor === "SYSTEM" ? "SYSTEM" : actor === "PSP" ? "PSP" : "STAFF";

/**
 * Applies one event inside the caller's transaction: locks the order, runs the state machine,
 * records history, and performs the database effects. Effects that talk to a payment provider are
 * returned for the caller to run after commit.
 */
export async function applyOrderEvent(tx: Tx, input: ApplyEventInput): Promise<ApplyEventResult> {
  const now = input.now ?? new Date();
  const [current] = await tx.select().from(order).where(eq(order.id, input.orderId)).for("update");
  if (!current) return { ok: false, reason: "INVALID_TRANSITION" };

  const result = transition(current.status, input.event, input.ctx);
  if (!result.ok) return { ok: false, reason: result.reason };

  const stamp = statusTimestamp[result.to];
  const [updated] = await tx
    .update(order)
    .set({
      status: result.to,
      version: sql`${order.version} + 1`,
      updatedAt: now,
      ...(stamp ? { [stamp]: now } : {}),
    })
    .where(eq(order.id, current.id))
    .returning();

  await tx.insert(orderStatusEvent).values({
    orderId: current.id,
    fromStatus: current.status,
    toStatus: result.to,
    eventKey: input.event,
    reasonKey: input.reasonKey ?? null,
    actorType: actorTypeOf(input.ctx.actor),
    actorId: input.actorId ?? null,
    payload: input.payload ?? null,
    createdAt: now,
  });

  for (const effect of result.effects) {
    if (effect === "RELEASE_SLOT_AND_STOCK") {
      await releaseSlotAndStock(tx, updated);
      await notifyRestockFor(tx, updated.id, input.appUrl, now);
    } else if (effect === "RESTORE_CART" && updated.cartId) {
      await tx.update(cart).set({ convertedOrderId: null, status: "OPEN" }).where(eq(cart.id, updated.cartId));
    } else if (effect === "CONVERT_CART" && updated.cartId) {
      await tx
        .update(cart)
        .set({ status: "CONVERTED", anonymousToken: null, customerId: updated.customerId })
        .where(eq(cart.id, updated.cartId));
    } else if (effect === "RESTOCK") {
      await restock(tx, updated, input.actorId ?? null);
      await notifyRestockFor(tx, updated.id, input.appUrl, now);
    } else if (effect === "TRIM_OVER_TOLERANCE_LINE") {
      // The butcher trims to the upper limit and weighs again.
      await tx.update(orderLine).set({ pendingActualG: null }).where(eq(orderLine.orderId, updated.id));
      await tx.update(order).set({ approvalDeadlineAt: null }).where(eq(order.id, updated.id));
    } else if (effect === "AUDIT") {
      await tx.insert(auditEvent).values({
        actorType: actorTypeOf(input.ctx.actor),
        actorId: input.actorId ?? null,
        entityType: "order",
        entityId: current.id,
        action: input.event,
        before: { status: current.status },
        after: { status: result.to, ...(input.payload ?? {}) },
        reason: input.ctx.reason ?? null,
        createdAt: now,
      });
    } else if (effect.startsWith("NOTIFY:")) {
      const key = effect.slice("NOTIFY:".length) as TemplateKey;
      // A caller that knows more (e.g. an extra charge was refunded) can send a truer variant of the same message.
      const override = (input.payload?.templateOverrides as Partial<Record<TemplateKey, TemplateKey>> | undefined)?.[key];
      await enqueueNotification(tx, updated, override ?? key, input.appUrl, now, input.payload);
    }
  }

  return { ok: true, from: current.status, to: result.to, effects: result.effects, order: updated };
}

async function releaseSlotAndStock(tx: Tx, o: typeof order.$inferSelect) {
  const lines = await tx.select().from(orderLine).where(eq(orderLine.orderId, o.id));
  const weight = o.reservedWeightG;
  if (o.slotId) {
    await tx
      .update(deliverySlot)
      .set({
        reservedOrders: sql`greatest(${deliverySlot.reservedOrders} - 1, 0)`,
        reservedWeightG: sql`greatest(${deliverySlot.reservedWeightG} - ${weight}, 0)`,
      })
      .where(eq(deliverySlot.id, o.slotId));
  }
  for (const l of lines) {
    const productId = sql`(select product_id from product_variant where id = ${l.variantId})`;
    await tx
      .update(stockItem)
      .set({
        reservedG: sql`greatest(${stockItem.reservedG} - ${l.estimatedG ?? 0}, 0)`,
        reservedUnits: sql`greatest(${stockItem.reservedUnits} - ${l.quantity ?? 0}, 0)`,
      })
      .where(eq(stockItem.productId, productId));
  }
}

/**
 * An order cancelled after picking started: release what's still reserved and, if the weighed
 * meat was already taken out of stock, put it back — a cut steak can still be sold.
 */
/** Stock this order held is free again: anyone waiting for one of its products hears, if it is really orderable now. */
async function notifyRestockFor(tx: Tx, orderId: string, appUrl: string, now: Date) {
  const products = await tx
    .selectDistinct({ productId: productVariant.productId })
    .from(orderLine)
    .innerJoin(productVariant, eq(productVariant.id, orderLine.variantId))
    .where(eq(orderLine.orderId, orderId));
  for (const { productId } of products) await notifyBackInStock(tx, { productId, appUrl, now });
}

async function restock(tx: Tx, o: typeof order.$inferSelect, staffId: string | null) {
  const lines = await tx
    .select({ line: orderLine, productId: sql<string>`(select product_id from product_variant where id = ${orderLine.variantId})` })
    .from(orderLine)
    .where(eq(orderLine.orderId, o.id));
  const committed = o.weighedAt !== null;
  for (const { line: l, productId } of lines) {
    const reservedG = committed || l.substitutionReasonKey ? 0 : (l.estimatedG ?? 0);
    const reservedUnits = committed || l.substitutionReasonKey ? 0 : (l.quantity ?? 0);
    const backG = committed && l.status === "WEIGHED" ? (l.actualG ?? 0) : 0;
    const backUnits = committed && l.status === "WEIGHED" ? (l.actualQuantity ?? 0) : 0;
    await tx
      .update(stockItem)
      .set({
        reservedG: sql`greatest(${stockItem.reservedG} - ${reservedG}, 0)`,
        reservedUnits: sql`greatest(${stockItem.reservedUnits} - ${reservedUnits}, 0)`,
        onHandG: sql`${stockItem.onHandG} + ${backG}`,
        onHandUnits: sql`${stockItem.onHandUnits} + ${backUnits}`,
      })
      .where(eq(stockItem.productId, productId));
    if (backG || backUnits) {
      await tx.insert(stockMovement).values({ productId, deltaG: backG, deltaUnits: backUnits, reason: "RETURN", orderId: o.id, staffId, note: "Order cancelled after weighing" });
    }
  }
  if (o.slotId) {
    await tx
      .update(deliverySlot)
      .set({ reservedOrders: sql`greatest(${deliverySlot.reservedOrders} - 1, 0)`, reservedWeightG: sql`greatest(${deliverySlot.reservedWeightG} - ${o.reservedWeightG}, 0)` })
      .where(eq(deliverySlot.id, o.slotId));
  }
}

export function trackingUrl(appUrl: string, o: { locale: string; orderNumber: string; accessToken: string }) {
  return `${appUrl}/${o.locale}/orders/${o.orderNumber}?t=${o.accessToken}`;
}

async function enqueueNotification(
  tx: Tx,
  o: typeof order.$inferSelect,
  key: TemplateKey,
  appUrl: string,
  now: Date,
  payload?: Record<string, unknown>,
) {
  const [c] = await tx.select().from(customer).where(eq(customer.id, o.customerId));
  if (!c) return;
  const locale = o.locale === "en" ? "en" : "he";
  const [slot] = o.slotId ? await tx.select().from(deliverySlot).where(eq(deliverySlot.id, o.slotId)) : [];
  const money = (v: number | null | undefined) => (v == null ? "" : formatAgorot(agorot(v), locale));
  const slotWindow = slot
    ? `${new Intl.DateTimeFormat(locale === "he" ? "he-IL" : "en-IL", { weekday: "long", day: "numeric", month: "numeric", timeZone: "Asia/Jerusalem" }).format(slot.startsAt)} ${formatIsraelTime(slot.startsAt)}–${formatIsraelTime(slot.endsAt)}`
    : "";

  const vars: TemplateVars = {
    firstName: c.firstName,
    orderNumber: o.orderNumber,
    trackingUrl: trackingUrl(appUrl, o),
    holdAmount: money(o.authorizationCeilingAgorot),
    estimateAmount: money(o.estimateTotalAgorot),
    finalAmount: money(o.finalTotalAgorot),
    slotWindow,
    ...(payload?.templateVars as TemplateVars | undefined),
  };
  const { body, actions } = renderTemplate(key, locale, vars);

  await tx
    .insert(notification)
    .values({
      orderId: o.id,
      customerId: c.id,
      templateKey: key,
      channel: "WHATSAPP",
      provider: "MOCK",
      toE164: c.phoneE164,
      locale,
      renderedBody: body,
      templateParams: templateParams(key, vars),
      actions,
      status: "QUEUED",
      idempotencyKey: `${o.id}:${key}:${toIsoDate(israelDateOf(now))}:${randomBytes(4).toString("hex")}`,
      queuedAt: now,
    })
    .onConflictDoNothing();
}

/** A payment-page timeout sweep would call this; exported for the return handler and tests. */
export async function activeOrderForCart(tx: Tx, cartId: string) {
  const [row] = await tx
    .select()
    .from(order)
    .where(and(eq(order.cartId, cartId), eq(order.status, "AUTH_PENDING"), isNull(order.cancelledAt)));
  return row ?? null;
}
