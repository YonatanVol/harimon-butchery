import { and, eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { holdSlotForCart } from "@/infra/cart/holds";
import { auditEvent, cartLine, invoice, mockPspTransaction, notification, order, orderLine, paymentCapture, paymentIntent, product, staffUser, stockItem } from "@/infra/db/schema";
import { resolveAuthorization } from "@/infra/orders/authorization";
import { placeOrder } from "@/infra/orders/placeOrder";
import {
  confirmHandling,
  finishWeighing,
  markPacked,
  markShort,
  recordWeight,
  retryCapture,
  startPicking,
  substituteCandidates,
  substituteLine,
  undoLine,
} from "@/infra/orders/weighing";
import { createMockProvider, decideMockPayment, type MockScenario } from "@/infra/payments/mock";
import { hashPin } from "@/infra/staff/pin";
import { connectTestDb, makeCart, makeSlot, makeWeightProduct, makeZone, truncateAll, validDetails } from "./support/db";

const { db, close } = connectTestDb();
const APP = "http://test.local";
const provider = createMockProvider(db, APP);

beforeEach(() => truncateAll(db));
afterAll(() => close());

async function staff(role: "BUTCHER" | "MANAGER" | "DRIVER") {
  const [s] = await db
    .insert(staffUser)
    .values({ phoneE164: `+97250${Math.floor(1_000_000 + Math.random() * 8_999_999)}`, fullNameHe: "צוות", fullNameEn: "Staff", role, pinHash: hashPin("4321") })
    .returning();
  return s;
}

/** An authorized order: entrecôte 2.5 kg @ ₪169 (hold ₪465) plus a second product. */
async function authorizedOrder(scenario: MockScenario = "APPROVE") {
  const zone = await makeZone(db, { minOrderAgorot: 0, freeDeliveryOverAgorot: 35_000 });
  const slot = await makeSlot(db, zone.id);
  const beef = await makeWeightProduct(db, { slug: "entrecote", pricePerKgAgorot: 16_900 });
  const cheaper = await makeWeightProduct(db, { slug: "shayetel", pricePerKgAgorot: 13_900 });
  // Same category so the cheaper cut is offered as a substitute.
  await db.update(product).set({ categoryId: beef.product.categoryId }).where(eq(product.id, cheaper.product.id));
  const c = await makeCart(db, zone.id);
  await db.insert(cartLine).values({ cartId: c.id, variantId: beef.variant.id, requestedG: 2500 });
  await holdSlotForCart(db, { cartId: c.id, zoneId: zone.id, slotId: slot.id });
  const placed = await placeOrder(db, provider, { cartId: c.id, details: validDetails, locale: "he", appUrl: APP });
  if (!placed.ok) throw new Error(placed.problem.key);
  const [intent] = await db.select().from(paymentIntent).where(eq(paymentIntent.orderId, placed.orderId));
  await decideMockPayment(db, intent.hostedPageRef!, scenario);
  await resolveAuthorization(db, provider, { intentId: intent.id, appUrl: APP });
  const [line] = await db.select().from(orderLine).where(eq(orderLine.orderId, placed.orderId));
  return { orderId: placed.orderId, line, beef, cheaper };
}

const version = async (orderId: string) => (await db.select().from(order).where(eq(order.id, orderId)))[0].version;

describe("weighing and charging (real Postgres, demo gateway)", () => {
  it("the storefront promise, end to end: hold ₪465, weigh 2.29 kg, charge ₪387.01, release the rest", async () => {
    const f = await authorizedOrder();
    const butcher = await staff("BUTCHER");

    expect((await startPicking(db, { orderId: f.orderId, staff: butcher, appUrl: APP })).ok).toBe(true);
    const w = await recordWeight(db, { orderId: f.orderId, lineId: f.line.id, actualG: 2290, expectedVersion: await version(f.orderId), staff: butcher });
    expect(w).toMatchObject({ ok: true, finalAgorot: 38_701, status: "within" });

    const done = await finishWeighing(db, provider, { orderId: f.orderId, expectedVersion: await version(f.orderId), staff: butcher, appUrl: APP });
    expect(done).toMatchObject({ ok: true, finalTotalAgorot: 38_701, capturedAgorot: 38_701 });

    const [o] = await db.select().from(order).where(eq(order.id, f.orderId));
    expect(o).toMatchObject({ status: "CAPTURED", itemsFinalAgorot: 38_701, finalTotalAgorot: 38_701, capturedAgorot: 38_701, authorizationCeilingAgorot: 46_500 });
    const [psp] = await db.select().from(mockPspTransaction);
    expect(psp.capturedAgorot).toBe(38_701);
    const [inv] = await db.select().from(invoice).where(eq(invoice.orderId, f.orderId));
    expect(inv.grossAgorot).toBe(38_701);
    expect(inv.vatAgorot + inv.netAgorot).toBe(38_701);
    expect(inv.number).toMatch(/^INV-\d{4}-000001$/);
    const [stock] = await db.select().from(stockItem).where(eq(stockItem.productId, f.beef.product.id));
    expect(stock).toMatchObject({ onHandG: 40_000 - 2290, reservedG: 0 });
    const keys = (await db.select().from(notification).where(eq(notification.orderId, f.orderId))).map((n) => n.templateKey);
    expect(keys).toEqual(expect.arrayContaining(["order.authorized", "order.picking", "order.repriced", "order.captured"]));

    expect((await markPacked(db, { orderId: f.orderId, staff: butcher, appUrl: APP })).ok).toBe(true);
  });

  it("over tolerance is refused until resolved; a manager can give the extra free, and it is recorded", async () => {
    const f = await authorizedOrder();
    const butcher = await staff("BUTCHER");
    const manager = await staff("MANAGER");
    await startPicking(db, { orderId: f.orderId, staff: butcher, appUrl: APP });

    expect(await recordWeight(db, { orderId: f.orderId, lineId: f.line.id, actualG: 3400, expectedVersion: await version(f.orderId), staff: butcher })).toEqual({
      ok: false,
      problem: { key: "OVER_TOLERANCE", maxG: 2750, overByG: 650 },
    });
    expect(
      await recordWeight(db, { orderId: f.orderId, lineId: f.line.id, actualG: 3400, expectedVersion: await version(f.orderId), staff: butcher, giveExtraFree: { managerId: manager.id, pin: "0000" } }),
    ).toEqual({ ok: false, problem: { key: "MANAGER_PIN_INVALID" } });

    const free = await recordWeight(db, {
      orderId: f.orderId,
      lineId: f.line.id,
      actualG: 3400,
      expectedVersion: await version(f.orderId),
      staff: butcher,
      giveExtraFree: { managerId: manager.id, pin: "4321" },
    });
    expect(free).toMatchObject({ ok: true, finalAgorot: 46_475 }); // charged at 2.75 kg
    const [o] = await db.select().from(order).where(eq(order.id, f.orderId));
    expect(o.goodwillAgorot).toBe(57_460 - 46_475);
    expect(await db.select().from(auditEvent).where(eq(auditEvent.action, "GIVE_EXTRA_FREE"))).toHaveLength(1);

    const done = await finishWeighing(db, provider, { orderId: f.orderId, expectedVersion: await version(f.orderId), staff: butcher, appUrl: APP });
    expect(done).toMatchObject({ ok: true, capturedAgorot: 46_475 });
  });

  it("under tolerance needs an explicit confirmation, and the customer pays less", async () => {
    const f = await authorizedOrder();
    const butcher = await staff("BUTCHER");
    await startPicking(db, { orderId: f.orderId, staff: butcher, appUrl: APP });
    expect(await recordWeight(db, { orderId: f.orderId, lineId: f.line.id, actualG: 2000, expectedVersion: await version(f.orderId), staff: butcher })).toEqual({
      ok: false,
      problem: { key: "UNDER_TOLERANCE", minG: 2250, shortByG: 250 },
    });
    expect(
      await recordWeight(db, { orderId: f.orderId, lineId: f.line.id, actualG: 2000, expectedVersion: await version(f.orderId), staff: butcher, confirmUnder: true }),
    ).toMatchObject({ ok: true, finalAgorot: 33_800 });
  });

  it("two tablets on one order: the stale one is told, not silently overwritten", async () => {
    const f = await authorizedOrder();
    const butcher = await staff("BUTCHER");
    await startPicking(db, { orderId: f.orderId, staff: butcher, appUrl: APP });
    const stale = await version(f.orderId);
    await recordWeight(db, { orderId: f.orderId, lineId: f.line.id, actualG: 2500, expectedVersion: stale, staff: butcher });
    expect(await recordWeight(db, { orderId: f.orderId, lineId: f.line.id, actualG: 2600, expectedVersion: stale, staff: butcher })).toEqual({ ok: false, problem: { key: "CONFLICT" } });
  });

  it("undo resets a weighed line; finishing needs every line done", async () => {
    const f = await authorizedOrder();
    const butcher = await staff("BUTCHER");
    await startPicking(db, { orderId: f.orderId, staff: butcher, appUrl: APP });
    await recordWeight(db, { orderId: f.orderId, lineId: f.line.id, actualG: 2500, expectedVersion: await version(f.orderId), staff: butcher });
    expect((await undoLine(db, { orderId: f.orderId, lineId: f.line.id, expectedVersion: await version(f.orderId), staff: butcher })).ok).toBe(true);
    expect(await finishWeighing(db, provider, { orderId: f.orderId, expectedVersion: await version(f.orderId), staff: butcher, appUrl: APP })).toEqual({
      ok: false,
      problem: { key: "LINES_INCOMPLETE", remaining: 1 },
    });
  });

  it("out of stock: substitute with a cheaper cut that fits the hold, or refuse one that doesn't", async () => {
    const f = await authorizedOrder();
    const butcher = await staff("BUTCHER");
    await startPicking(db, { orderId: f.orderId, staff: butcher, appUrl: APP });

    const candidates = await substituteCandidates(db, f.line.id);
    expect(candidates).toEqual([expect.objectContaining({ variantId: f.cheaper.variant.id, deltaPerKgAgorot: -3000, fitsHold: true })]);

    const pricey = await makeWeightProduct(db, { slug: "fillet", pricePerKgAgorot: 28_900 });
    expect(await substituteLine(db, { orderId: f.orderId, lineId: f.line.id, variantId: pricey.variant.id, expectedVersion: await version(f.orderId), staff: butcher })).toEqual({
      ok: false,
      problem: { key: "SUBSTITUTE_TOO_EXPENSIVE" },
    });

    expect((await substituteLine(db, { orderId: f.orderId, lineId: f.line.id, variantId: f.cheaper.variant.id, expectedVersion: await version(f.orderId), staff: butcher })).ok).toBe(true);
    const lines = await db.select().from(orderLine).where(eq(orderLine.orderId, f.orderId));
    const replacement = lines.find((l) => l.status === "PENDING")!;
    expect(replacement).toMatchObject({ pricePerKgAgorot: 13_900, estimatedG: 2500, toleranceMaxG: 2750 });

    await recordWeight(db, { orderId: f.orderId, lineId: replacement.id, actualG: 2600, expectedVersion: await version(f.orderId), staff: butcher });
    const done = await finishWeighing(db, provider, { orderId: f.orderId, expectedVersion: await version(f.orderId), staff: butcher, appUrl: APP });
    expect(done).toMatchObject({ ok: true, capturedAgorot: 36_140 }); // 2.6 kg × ₪139
    const [beefStock] = await db.select().from(stockItem).where(eq(stockItem.productId, f.beef.product.id));
    expect(beefStock).toMatchObject({ onHandG: 40_000, reservedG: 0 });
    const [cheapStock] = await db.select().from(stockItem).where(eq(stockItem.productId, f.cheaper.product.id));
    expect(cheapStock).toMatchObject({ onHandG: 40_000 - 2600, reservedG: 0 });
  });

  it("everything short: refuses to charge ₪0 and says so", async () => {
    const f = await authorizedOrder();
    const butcher = await staff("BUTCHER");
    await startPicking(db, { orderId: f.orderId, staff: butcher, appUrl: APP });
    await markShort(db, { orderId: f.orderId, lineId: f.line.id, expectedVersion: await version(f.orderId), staff: butcher });
    expect(await finishWeighing(db, provider, { orderId: f.orderId, expectedVersion: await version(f.orderId), staff: butcher, appUrl: APP })).toEqual({
      ok: false,
      problem: { key: "NOTHING_TO_CHARGE" },
    });
  });

  it("liver can't be finished until broiling is confirmed", async () => {
    const f = await authorizedOrder();
    const butcher = await staff("BUTCHER");
    await db.update(orderLine).set({ handlingFlags: ["REQUIRES_BROILING_TZLIYA"] }).where(eq(orderLine.id, f.line.id));
    await startPicking(db, { orderId: f.orderId, staff: butcher, appUrl: APP });
    await recordWeight(db, { orderId: f.orderId, lineId: f.line.id, actualG: 2500, expectedVersion: await version(f.orderId), staff: butcher });
    expect(await finishWeighing(db, provider, { orderId: f.orderId, expectedVersion: await version(f.orderId), staff: butcher, appUrl: APP })).toMatchObject({
      ok: false,
      problem: { key: "HANDLING_NOT_CONFIRMED" },
    });
    await confirmHandling(db, { orderId: f.orderId, lineId: f.line.id, expectedVersion: await version(f.orderId), staff: butcher });
    expect((await finishWeighing(db, provider, { orderId: f.orderId, expectedVersion: await version(f.orderId), staff: butcher, appUrl: APP })).ok).toBe(true);
  });

  it("a failed charge stops the order with a reason, allows 3 attempts, and never dispatches silently", async () => {
    const f = await authorizedOrder("APPROVE_CAPTURE_FAILS");
    const butcher = await staff("BUTCHER");
    await startPicking(db, { orderId: f.orderId, staff: butcher, appUrl: APP });
    await recordWeight(db, { orderId: f.orderId, lineId: f.line.id, actualG: 2500, expectedVersion: await version(f.orderId), staff: butcher });

    expect(await finishWeighing(db, provider, { orderId: f.orderId, expectedVersion: await version(f.orderId), staff: butcher, appUrl: APP })).toEqual({
      ok: false,
      problem: { key: "CAPTURE_FAILED", reason: "HOLD_EXPIRED" },
    });
    expect((await db.select().from(order).where(eq(order.id, f.orderId)))[0].status).toBe("CAPTURE_FAILED");
    expect(await markPacked(db, { orderId: f.orderId, staff: butcher, appUrl: APP })).toMatchObject({ ok: false, problem: { key: "WRONG_STATE" } });

    expect((await retryCapture(db, provider, { orderId: f.orderId, staff: butcher, appUrl: APP })).ok).toBe(false);
    expect((await retryCapture(db, provider, { orderId: f.orderId, staff: butcher, appUrl: APP })).ok).toBe(false);
    expect(await retryCapture(db, provider, { orderId: f.orderId, staff: butcher, appUrl: APP })).toEqual({ ok: false, problem: { key: "TOO_MANY_CAPTURE_ATTEMPTS" } });
    const captures = await db.select().from(paymentCapture);
    expect(captures).toHaveLength(3);
    expect(captures.every((c) => c.status === "FAILED")).toBe(true);
    expect((await db.select().from(notification).where(and(eq(notification.orderId, f.orderId), eq(notification.templateKey, "order.capture_issue")))).length).toBeGreaterThan(0);
  });

  it("a driver cannot weigh", async () => {
    const f = await authorizedOrder();
    const driver = await staff("DRIVER");
    expect(await startPicking(db, { orderId: f.orderId, staff: driver, appUrl: APP })).toEqual({ ok: false, problem: { key: "NOT_PERMITTED" } });
  });
});
