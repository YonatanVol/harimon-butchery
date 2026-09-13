import { and, eq, isNull } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { holdSlotForCart } from "@/infra/cart/holds";
import { cart, cartLine, deliverySlot, notification, order, orderLine, orderStatusEvent, paymentIntent, slotHold, stockItem } from "@/infra/db/schema";
import { resolveAuthorization } from "@/infra/orders/authorization";
import { placeOrder } from "@/infra/orders/placeOrder";
import { createMockProvider, decideMockPayment } from "@/infra/payments/mock";
import { connectTestDb, makeCart, makeSlot, makeWeightProduct, makeZone, truncateAll, validDetails } from "./support/db";

const { db, close } = connectTestDb();
const APP = "http://test.local";
const provider = createMockProvider(db, APP);

beforeEach(() => truncateAll(db));
afterAll(() => close());

async function readyCart(opts: { requestedG?: number; capacityOrders?: number } = {}) {
  const zone = await makeZone(db, { minOrderAgorot: 10_000, freeDeliveryOverAgorot: 35_000, deliveryFeeAgorot: 2_500 });
  const slot = await makeSlot(db, zone.id, { capacityOrders: opts.capacityOrders ?? 5 });
  const { product, variant } = await makeWeightProduct(db);
  const c = await makeCart(db, zone.id);
  await db.insert(cartLine).values({ cartId: c.id, variantId: variant.id, requestedG: opts.requestedG ?? 2500 });
  const held = await holdSlotForCart(db, { cartId: c.id, zoneId: zone.id, slotId: slot.id });
  if (!held.ok) throw new Error("hold failed");
  return { zone, slot, product, variant, cart: c };
}

describe("placing an order and paying (real Postgres, demo gateway)", () => {
  it("approve: reserves slot and stock, freezes prices, converts the cart, queues the confirmation", async () => {
    const f = await readyCart();
    const placed = await placeOrder(db, provider, { cartId: f.cart.id, details: validDetails, locale: "he", appUrl: APP });
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    expect(placed.redirectUrl).toMatch(new RegExp(`^${APP}/he/pay/demo/mock_`));

    const [o] = await db.select().from(order).where(eq(order.id, placed.orderId));
    expect(o).toMatchObject({
      status: "AUTH_PENDING",
      itemsEstimateAgorot: 42_250, // 2.5 kg × ₪169
      deliveryFeeAgorot: 0, // over ₪350
      authorizationCeilingAgorot: 46_500, // 2.75 kg × ₪169 = 464.75 → 465
      reservedWeightG: 2500,
    });
    const [line] = await db.select().from(orderLine).where(eq(orderLine.orderId, o.id));
    expect(line).toMatchObject({ estimatedG: 2500, toleranceMinG: 2250, toleranceMaxG: 2750, estimateAgorot: 42_250, ceilingAgorot: 46_475 });
    expect((await db.select().from(deliverySlot).where(eq(deliverySlot.id, f.slot.id)))[0]).toMatchObject({ reservedOrders: 1, reservedWeightG: 2500 });
    expect((await db.select().from(stockItem).where(eq(stockItem.productId, f.product.id)))[0].reservedG).toBe(2500);
    expect(await db.select().from(slotHold).where(and(eq(slotHold.cartId, f.cart.id), isNull(slotHold.releasedAt)))).toHaveLength(0);

    const [intent] = await db.select().from(paymentIntent).where(eq(paymentIntent.orderId, o.id));
    await decideMockPayment(db, intent.hostedPageRef!, "APPROVE");
    const outcome = await resolveAuthorization(db, provider, { intentId: intent.id, appUrl: APP });
    expect(outcome).toMatchObject({ kind: "APPROVED", orderNumber: o.orderNumber });

    const [after] = await db.select().from(order).where(eq(order.id, o.id));
    expect(after.status).toBe("AUTHORIZED");
    const [c] = await db.select().from(cart).where(eq(cart.id, f.cart.id));
    expect(c).toMatchObject({ status: "CONVERTED", anonymousToken: null });
    const [authorized] = await db.select().from(paymentIntent).where(eq(paymentIntent.id, intent.id));
    expect(authorized).toMatchObject({ status: "AUTHORIZED", cardLast4: "4242" });

    const events = await db.select().from(orderStatusEvent).where(eq(orderStatusEvent.orderId, o.id));
    expect(events.map((e) => e.toStatus)).toEqual(["PLACED", "AUTH_PENDING", "AUTHORIZED"]);
    const [msg] = await db.select().from(notification).where(eq(notification.orderId, o.id));
    expect(msg.templateKey).toBe("order.authorized");
    expect(msg.renderedBody).toContain("465");
    expect(msg.renderedBody).toContain(o.orderNumber);

    // Resolving again (a refreshed return page) changes nothing.
    await resolveAuthorization(db, provider, { intentId: intent.id, appUrl: APP });
    expect(await db.select().from(orderStatusEvent).where(eq(orderStatusEvent.orderId, o.id))).toHaveLength(3);
  });

  it("decline: releases everything, keeps the cart intact, and re-holds the same window", async () => {
    const f = await readyCart();
    const placed = await placeOrder(db, provider, { cartId: f.cart.id, details: validDetails, locale: "he", appUrl: APP });
    if (!placed.ok) throw new Error(placed.problem.key);
    const [intent] = await db.select().from(paymentIntent).where(eq(paymentIntent.orderId, placed.orderId));
    await decideMockPayment(db, intent.hostedPageRef!, "DECLINE_INSUFFICIENT");

    expect(await resolveAuthorization(db, provider, { intentId: intent.id, appUrl: APP })).toMatchObject({ kind: "DECLINED", reason: "INSUFFICIENT_FUNDS" });
    expect((await db.select().from(order).where(eq(order.id, placed.orderId)))[0].status).toBe("AUTH_DECLINED");
    expect((await db.select().from(deliverySlot).where(eq(deliverySlot.id, f.slot.id)))[0]).toMatchObject({ reservedOrders: 0, reservedWeightG: 0 });
    expect((await db.select().from(stockItem).where(eq(stockItem.productId, f.product.id)))[0].reservedG).toBe(0);
    const [c] = await db.select().from(cart).where(eq(cart.id, f.cart.id));
    expect(c).toMatchObject({ status: "OPEN", convertedOrderId: null });
    expect(await db.select().from(cartLine).where(eq(cartLine.cartId, f.cart.id))).toHaveLength(1);
    expect(await db.select().from(slotHold).where(and(eq(slotHold.cartId, f.cart.id), isNull(slotHold.releasedAt)))).toHaveLength(1);

    // And the customer can try again straight away.
    const retry = await placeOrder(db, provider, { cartId: f.cart.id, details: validDetails, locale: "he", appUrl: APP });
    expect(retry.ok).toBe(true);
  });

  it("a double-submitted checkout returns the same order, not a second one", async () => {
    const f = await readyCart();
    const first = await placeOrder(db, provider, { cartId: f.cart.id, details: validDetails, locale: "he", appUrl: APP });
    const second = await placeOrder(db, provider, { cartId: f.cart.id, details: validDetails, locale: "he", appUrl: APP });
    expect(first.ok && second.ok && first.orderId === second.orderId).toBe(true);
    expect(await db.select().from(order)).toHaveLength(1);
  });

  it("refuses with a named reason: invalid details, no hold, below minimum, stock gone", async () => {
    const f = await readyCart({ requestedG: 500 }); // ₪84.50 < ₪100 minimum
    expect(await placeOrder(db, provider, { cartId: f.cart.id, details: { ...validDetails, phone: "03-1234567" }, locale: "he", appUrl: APP })).toMatchObject({
      ok: false,
      problem: { key: "DETAILS_INVALID", errors: { phone: "PHONE_NOT_MOBILE" } },
    });
    expect(await placeOrder(db, provider, { cartId: f.cart.id, details: validDetails, locale: "he", appUrl: APP })).toMatchObject({
      ok: false,
      problem: { key: "BELOW_MINIMUM", gapAgorot: 10_000 - 8_450 },
    });

    await db.update(cartLine).set({ requestedG: 2500 }).where(eq(cartLine.cartId, f.cart.id));
    await db.update(stockItem).set({ onHandG: 1000 }).where(eq(stockItem.productId, f.product.id));
    expect(await placeOrder(db, provider, { cartId: f.cart.id, details: validDetails, locale: "he", appUrl: APP })).toMatchObject({
      ok: false,
      problem: { key: "LINE_CHANGED", problem: { key: "NOT_ENOUGH_STOCK", availableG: 1000 } },
    });

    await db.update(stockItem).set({ onHandG: 40_000 }).where(eq(stockItem.productId, f.product.id));
    await db.update(slotHold).set({ releasedAt: new Date() }).where(eq(slotHold.cartId, f.cart.id));
    expect(await placeOrder(db, provider, { cartId: f.cart.id, details: validDetails, locale: "he", appUrl: APP })).toMatchObject({ ok: false, problem: { key: "NO_HOLD" } });
    expect(await db.select().from(order)).toHaveLength(0);
  });

  it("the database refuses to overbook a slot even when holds were granted", async () => {
    const zone = await makeZone(db, { minOrderAgorot: 0 });
    const slot = await makeSlot(db, zone.id, { capacityOrders: 5 });
    const { variant } = await makeWeightProduct(db);
    const carts = [];
    for (let i = 0; i < 5; i++) {
      const c = await makeCart(db, zone.id);
      await db.insert(cartLine).values({ cartId: c.id, variantId: variant.id, requestedG: 1000 });
      await holdSlotForCart(db, { cartId: c.id, zoneId: zone.id, slotId: slot.id });
      carts.push(c);
    }
    // Staff took 3 phone orders into the same window after the holds were granted.
    await db.update(deliverySlot).set({ reservedOrders: 3 }).where(eq(deliverySlot.id, slot.id));

    const results = await Promise.all(carts.map((c) => placeOrder(db, provider, { cartId: c.id, details: validDetails, locale: "he", appUrl: APP })));
    expect(results.filter((r) => r.ok)).toHaveLength(2);
    expect(results.filter((r) => !r.ok).every((r) => !r.ok && r.problem.key === "SLOT_UNAVAILABLE")).toBe(true);
    expect((await db.select().from(deliverySlot).where(eq(deliverySlot.id, slot.id)))[0].reservedOrders).toBe(5);
  });
});
