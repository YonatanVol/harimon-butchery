import { and, eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { PaymentProvider } from "@/domain/payments/provider";
import { holdSlotForCart } from "@/infra/cart/holds";
import { loadSlotDays } from "@/infra/cart/repository";
import { loadOrderHistory } from "@/infra/customer/history";
import { mockPspTransaction, notification, order, orderLine, paymentIntent, paymentRefund } from "@/infra/db/schema";
import { cancelByCustomer, decideExtra, expireApprovals } from "@/infra/orders/customer";
import { driverAction, refundOrder, shopDecision } from "@/infra/orders/delivery";
import { confirmPackageLine, finishWeighing, markPacked, markShort, recordWeight } from "@/infra/orders/weighing";
import { createMockProvider } from "@/infra/payments/mock";
import { connectTestDb, makeCart, makeStaff, truncateAll } from "./support/db";
import { APP, authorizedOrder, paidPackageOrder, versionOf } from "./support/orders";
import { askCustomer, startPicking } from "@/infra/orders/weighing";

/** The money paths an independent review found wrong, each pinned by the scenario it described. */

const { db, close } = connectTestDb();
const provider = createMockProvider(db, APP);
beforeEach(() => truncateAll(db));
afterAll(() => close());

const orderRow = async (id: string) => (await db.select().from(order).where(eq(order.id, id)))[0];
const pspFor = async (ref: string) => (await db.select().from(mockPspTransaction).where(eq(mockPspTransaction.ref, ref)))[0];

async function delivered(orderId: string) {
  const driver = await makeStaff(db, "DRIVER");
  const packer = await makeStaff(db, "PACKER");
  expect((await markPacked(db, { orderId, staff: packer, appUrl: APP })).ok).toBe(true);
  expect(await driverAction(db, { orderId, event: "DISPATCHED", staff: driver, appUrl: APP })).toEqual({ ok: true });
  expect(await driverAction(db, { orderId, event: "DELIVERED", staff: driver, appUrl: APP })).toEqual({ ok: true });
}

describe("package-only orders (charged at checkout)", () => {
  it("customer cancel refunds the charge and says so — it doesn't pretend nothing was charged", async () => {
    const f = await paidPackageOrder(db, provider);
    expect(f.intent.purpose).toBe("CHARGE");
    const charged = f.intent.amountAgorot;
    expect(await cancelByCustomer(db, provider, { orderNumber: f.order.orderNumber, token: f.order.accessToken, appUrl: APP })).toEqual({ ok: true });

    expect((await orderRow(f.orderId)).status).toBe("CANCELLED_BY_CUSTOMER");
    expect((await pspFor(f.intent.providerTransactionRef!)).refundedAgorot).toBe(charged);
    expect((await db.select().from(paymentIntent).where(eq(paymentIntent.id, f.intent.id)))[0].status).toBe("VOIDED");
    const messages = await db.select().from(notification).where(eq(notification.orderId, f.orderId));
    expect(messages.map((m) => m.templateKey)).toContain("order.cancelled_refunded");
    expect(messages.map((m) => m.templateKey)).not.toContain("order.cancelled");
  });

  it("shop cancel refunds it too", async () => {
    const f = await paidPackageOrder(db, provider);
    const manager = await makeStaff(db, "MANAGER");
    expect(await shopDecision(db, provider, { orderId: f.orderId, decision: "CANCEL", reason: "הספק לא הגיע היום", staff: manager, appUrl: APP })).toEqual({ ok: true });
    expect((await pspFor(f.intent.providerTransactionRef!)).refundedAgorot).toBe(f.intent.amountAgorot);
  });

  it("one bundle short: the difference is refunded at finish, and a later refund still works", async () => {
    const f = await paidPackageOrder(db, provider);
    const butcher = await makeStaff(db, "BUTCHER");
    const manager = await makeStaff(db, "MANAGER");
    await startPicking(db, { orderId: f.orderId, staff: butcher, appUrl: APP });
    const [big, small] = f.lines;
    expect((await confirmPackageLine(db, { orderId: f.orderId, lineId: big.id, expectedVersion: await versionOf(db, f.orderId), staff: butcher })).ok).toBe(true);
    expect((await markShort(db, { orderId: f.orderId, lineId: small.id, expectedVersion: await versionOf(db, f.orderId), staff: butcher })).ok).toBe(true);
    const done = await finishWeighing(db, provider, { orderId: f.orderId, expectedVersion: await versionOf(db, f.orderId), staff: butcher, appUrl: APP });
    expect(done.ok).toBe(true);
    await delivered(f.orderId);

    const captured = (await orderRow(f.orderId)).capturedAgorot!;
    expect(await refundOrder(db, provider, { orderId: f.orderId, amountAgorot: captured, reason: "הלקוח החזיר את המארז", staff: manager, appUrl: APP })).toEqual({ ok: true });
    const tx = await pspFor(f.intent.providerTransactionRef!);
    // Everything charged at checkout came back: the short bundle at finish, the rest now.
    expect(tx.refundedAgorot).toBe(tx.capturedAgorot);
    expect((await orderRow(f.orderId)).status).toBe("REFUNDED");
  });
});

describe("approving an extra", () => {
  async function asked() {
    const f = await authorizedOrder(db, provider);
    const butcher = await makeStaff(db, "BUTCHER");
    await startPicking(db, { orderId: f.orderId, staff: butcher, appUrl: APP });
    const r = await askCustomer(db, { orderId: f.orderId, lineId: f.line.id, actualG: 3400, expectedVersion: await versionOf(db, f.orderId), staff: butcher, appUrl: APP, locale: "he" });
    if (!r.ok) throw new Error(r.problem.key);
    return { ...f, butcher };
  }
  const tokenCharges = async () => (await db.select().from(mockPspTransaction)).filter((t) => t.scenario === "TOKEN_CHARGE");

  it("two approvals at once charge the card once", async () => {
    const f = await asked();
    const input = { orderNumber: f.order.orderNumber, token: f.order.accessToken, decision: "APPROVE" as const, appUrl: APP };
    const results = await Promise.all([decideExtra(db, provider, input), decideExtra(db, provider, input)]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(await tokenCharges()).toHaveLength(1);
    expect(await db.select().from(paymentIntent).where(and(eq(paymentIntent.orderId, f.orderId), eq(paymentIntent.purpose, "EXTRA")))).toHaveLength(1);
  });

  it("the deadline passing during an approval never leaves an unrecorded charge", async () => {
    const f = await asked();
    await db.update(order).set({ approvalDeadlineAt: new Date(Date.now() + 1_000) }).where(eq(order.id, f.orderId));
    await Promise.all([
      decideExtra(db, provider, { orderNumber: f.order.orderNumber, token: f.order.accessToken, decision: "APPROVE", appUrl: APP }),
      expireApprovals(db, { appUrl: APP, now: new Date(Date.now() + 5_000) }),
    ]);
    const charges = await tokenCharges();
    const extras = await db.select().from(paymentIntent).where(and(eq(paymentIntent.orderId, f.orderId), eq(paymentIntent.purpose, "EXTRA")));
    expect(charges.length).toBe(extras.length);
    expect((await orderRow(f.orderId)).status).toBe("PICKING");
  });

  it("an order with an approved extra can be refunded in full after delivery", async () => {
    const f = await asked();
    const manager = await makeStaff(db, "MANAGER");
    await decideExtra(db, provider, { orderNumber: f.order.orderNumber, token: f.order.accessToken, decision: "APPROVE", appUrl: APP });
    expect((await finishWeighing(db, provider, { orderId: f.orderId, expectedVersion: await versionOf(db, f.orderId), staff: f.butcher, appUrl: APP })).ok).toBe(true);
    await delivered(f.orderId);
    const o = await orderRow(f.orderId);
    expect(await refundOrder(db, provider, { orderId: f.orderId, amountAgorot: o.capturedAgorot!, reason: "איכות לא תקינה, זיכוי מלא", staff: manager, appUrl: APP })).toEqual({ ok: true });
    const [extraCharge] = await tokenCharges();
    expect(extraCharge.refundedAgorot).toBe(o.extraChargedAgorot);
    expect((await orderRow(f.orderId)).status).toBe("REFUNDED");
  });
});

describe("refund retries", () => {
  it("a refund that failed can be retried with the same amount, and is recorded once", async () => {
    const f = await authorizedOrder(db, provider);
    const butcher = await makeStaff(db, "BUTCHER");
    const manager = await makeStaff(db, "MANAGER");
    await startPicking(db, { orderId: f.orderId, staff: butcher, appUrl: APP });
    await recordWeight(db, { orderId: f.orderId, lineId: f.line.id, actualG: 2500, expectedVersion: await versionOf(db, f.orderId), staff: butcher });
    await finishWeighing(db, provider, { orderId: f.orderId, expectedVersion: await versionOf(db, f.orderId), staff: butcher, appUrl: APP });
    await delivered(f.orderId);

    let failOnce = true;
    const flaky: PaymentProvider = { ...provider, refund: async (req) => (failOnce ? ((failOnce = false), { ok: false, code: "TIMEOUT" }) : provider.refund(req)) };
    const input = { orderId: f.orderId, amountAgorot: 10_000, reason: "חלק מהבשר הגיע פגום", staff: manager, appUrl: APP };
    expect(await refundOrder(db, flaky, input)).toEqual({ ok: false, problem: { key: "REFUND_FAILED" } });
    expect((await orderRow(f.orderId)).status).toBe("REFUND_PENDING");
    expect(await refundOrder(db, flaky, input)).toEqual({ ok: true });

    const o = await orderRow(f.orderId);
    expect(o).toMatchObject({ status: "PARTIALLY_REFUNDED", refundedAgorot: 10_000 });
    const rows = await db.select().from(paymentRefund);
    expect(rows.filter((r) => r.status === "SUCCEEDED")).toHaveLength(1);
  });
});

describe("counts computed in SQL subqueries", () => {
  it("the cart's delivery windows count other customers' holds", async () => {
    const f = await authorizedOrder(db, provider);
    const others = await Promise.all([makeCart(db, f.zone.id), makeCart(db, f.zone.id)]);
    for (const c of others) expect((await holdSlotForCart(db, { cartId: c.id, zoneId: f.zone.id, slotId: f.slot.id })).ok).toBe(true);
    const mine = await makeCart(db, f.zone.id);
    const days = await loadSlotDays(f.zone.id, mine.id, new Date(), 4);
    const shown = days.flatMap((d) => d.slots).find((s) => s.id === f.slot.id)!;
    // capacity 3, one order booked, two other carts holding: nothing left to offer.
    expect(shown.availability.kind).toBe("FULL");
  });

  it("order history counts each order's own lines", async () => {
    const f = await paidPackageOrder(db, provider);
    const [row] = await loadOrderHistory("+972541234567");
    expect(row.lineCount).toBe((await db.select().from(orderLine).where(eq(orderLine.orderId, f.orderId))).length);
  });
});

describe("staff PIN guessing", () => {
  it("parallel wrong guesses at a manager's PIN lock it after five, on sign-in and on the weighing screen alike", async () => {
    const { checkStaffPin } = await import("@/infra/staff/pinCheck");
    const { staffUser } = await import("@/infra/db/schema");
    const manager = await makeStaff(db, "MANAGER", "4321");
    const guesses = await Promise.all(Array.from({ length: 12 }, (_, i) => checkStaffPin(db, manager.id, String(1000 + i))));
    expect(guesses.filter((g) => !g.ok && g.problem.key === "WRONG_PIN")).toHaveLength(4);
    // Even the right PIN is refused while locked.
    expect((await checkStaffPin(db, manager.id, "4321")).ok).toBe(false);
    const [row] = await db.select().from(staffUser).where(eq(staffUser.id, manager.id));
    expect(row.lockedUntil!.getTime()).toBeGreaterThan(Date.now());

    const f = await authorizedOrder(db, provider);
    const butcher = await makeStaff(db, "BUTCHER");
    await startPicking(db, { orderId: f.orderId, staff: butcher, appUrl: APP });
    const r = await recordWeight(db, { orderId: f.orderId, lineId: f.line.id, actualG: 3400, expectedVersion: await versionOf(db, f.orderId), staff: butcher, giveExtraFree: { managerId: manager.id, pin: "4321" } });
    expect(r).toMatchObject({ ok: false, problem: { key: "MANAGER_PIN_LOCKED" } });
  });
});

describe("abandoned payment pages", () => {
  it("an unpaid page from a cart that has since changed is expired, its window freed, and a fresh page made", async () => {
    const { placeOrder } = await import("@/infra/orders/placeOrder");
    const { cart, cartLine, deliverySlot } = await import("@/infra/db/schema");
    const { validDetails } = await import("./support/db");
    const f = await authorizedOrder(db, provider); // brings a zone, a slot and products
    const c = await makeCart(db, f.zone.id);
    await db.insert(cartLine).values({ cartId: c.id, variantId: f.cheaper.variant.id, requestedG: 2000 });
    expect((await holdSlotForCart(db, { cartId: c.id, zoneId: f.zone.id, slotId: f.slot.id })).ok).toBe(true);
    const first = await placeOrder(db, provider, { cartId: c.id, details: validDetails, locale: "he", appUrl: APP });
    if (!first.ok) throw new Error(first.problem.key);
    const reservedWithPending = (await db.select().from(deliverySlot).where(eq(deliverySlot.id, f.slot.id)))[0].reservedOrders;

    // The customer comes back, changes the cart, and checks out again without paying the first page.
    await db.update(cartLine).set({ requestedG: 2500 }).where(eq(cartLine.cartId, c.id));
    expect((await holdSlotForCart(db, { cartId: c.id, zoneId: f.zone.id, slotId: f.slot.id })).ok).toBe(true);
    const second = await placeOrder(db, provider, { cartId: c.id, details: validDetails, locale: "he", appUrl: APP });
    if (!second.ok) throw new Error(second.problem.key);

    expect(second.orderId).not.toBe(first.orderId);
    expect((await orderRow(first.orderId)).status).toBe("AUTH_EXPIRED");
    expect((await db.select().from(deliverySlot).where(eq(deliverySlot.id, f.slot.id)))[0].reservedOrders).toBe(reservedWithPending);
    expect((await db.select().from(cart).where(eq(cart.id, c.id)))[0].convertedOrderId).toBe(second.orderId);

    // Paying the old page afterwards doesn't keep the money.
    const { decideMockPayment } = await import("@/infra/payments/mock");
    const { resolveAuthorization } = await import("@/infra/orders/authorization");
    const [oldIntent] = await db.select().from(paymentIntent).where(eq(paymentIntent.orderId, first.orderId));
    await decideMockPayment(db, oldIntent.hostedPageRef!, "APPROVE");
    expect(await resolveAuthorization(db, provider, { intentId: oldIntent.id, appUrl: APP })).toMatchObject({ kind: "DECLINED", reason: "PAGE_EXPIRED" });
    expect((await pspFor(oldIntent.hostedPageRef!)).status).toBe("VOIDED");
  });

  it("the board sweep expires pages left unpaid for 25 minutes", async () => {
    const { expireAbandonedCheckouts } = await import("@/infra/orders/authorization");
    const f = await authorizedOrder(db, provider);
    const c = await makeCart(db, f.zone.id);
    const { cartLine } = await import("@/infra/db/schema");
    const { validDetails } = await import("./support/db");
    const { placeOrder } = await import("@/infra/orders/placeOrder");
    await db.insert(cartLine).values({ cartId: c.id, variantId: f.cheaper.variant.id, requestedG: 2000 });
    await holdSlotForCart(db, { cartId: c.id, zoneId: f.zone.id, slotId: f.slot.id });
    const placed = await placeOrder(db, provider, { cartId: c.id, details: validDetails, locale: "he", appUrl: APP });
    if (!placed.ok) throw new Error(placed.problem.key);
    expect(await expireAbandonedCheckouts(db, provider, { appUrl: APP })).toBe(0);
    expect(await expireAbandonedCheckouts(db, provider, { appUrl: APP, now: new Date(Date.now() + 30 * 60_000) })).toBe(1);
    expect((await orderRow(placed.orderId)).status).toBe("AUTH_EXPIRED");
  });
});

describe("a charge that never finished", () => {
  it("staff can check it again after two minutes; it records a charge that went through without charging twice", async () => {
    const { reconcileCapture } = await import("@/infra/orders/weighing");
    const { paymentCapture } = await import("@/infra/db/schema");
    const f = await authorizedOrder(db, provider);
    const butcher = await makeStaff(db, "BUTCHER");
    await startPicking(db, { orderId: f.orderId, staff: butcher, appUrl: APP });
    await recordWeight(db, { orderId: f.orderId, lineId: f.line.id, actualG: 2500, expectedVersion: await versionOf(db, f.orderId), staff: butcher });

    // The provider charges, then the server dies before recording it.
    const dying: PaymentProvider = { ...provider, capture: async (req) => { await provider.capture(req); throw new Error("process killed"); } };
    await expect(finishWeighing(db, dying, { orderId: f.orderId, expectedVersion: await versionOf(db, f.orderId), staff: butcher, appUrl: APP })).rejects.toThrow();
    expect((await orderRow(f.orderId)).status).toBe("CAPTURE_PENDING");

    expect(await reconcileCapture(db, provider, { orderId: f.orderId, staff: butcher, appUrl: APP })).toEqual({ ok: false, problem: { key: "CAPTURE_IN_PROGRESS" } });
    const later = new Date(Date.now() + 3 * 60_000);
    const r = await reconcileCapture(db, provider, { orderId: f.orderId, staff: butcher, appUrl: APP, now: later });
    expect(r).toMatchObject({ ok: true });
    expect((await orderRow(f.orderId)).status).toBe("CAPTURED");
    const [intent] = await db.select().from(paymentIntent).where(eq(paymentIntent.orderId, f.orderId));
    const tx = await pspFor(intent.providerTransactionRef!);
    expect(tx.capturedAgorot).toBe((await orderRow(f.orderId)).capturedAgorot);
    expect((await db.select().from(paymentCapture)).map((c) => c.status)).toEqual(["SUCCEEDED"]);
  });
});

describe("weighing-screen guards and the log", () => {
  it("a line the customer paid extra for can't be undone, shorted or re-weighed", async () => {
    const { undoLine } = await import("@/infra/orders/weighing");
    const f = await authorizedOrder(db, provider);
    const butcher = await makeStaff(db, "BUTCHER");
    await startPicking(db, { orderId: f.orderId, staff: butcher, appUrl: APP });
    await askCustomer(db, { orderId: f.orderId, lineId: f.line.id, actualG: 3400, expectedVersion: await versionOf(db, f.orderId), staff: butcher, appUrl: APP, locale: "he" });
    await decideExtra(db, provider, { orderNumber: f.order.orderNumber, token: f.order.accessToken, decision: "APPROVE", appUrl: APP });
    const v = async () => versionOf(db, f.orderId);
    const locked = { ok: false, problem: { key: "EXTRA_ALREADY_CHARGED" } };
    expect(await undoLine(db, { orderId: f.orderId, lineId: f.line.id, expectedVersion: await v(), staff: butcher })).toEqual(locked);
    expect(await markShort(db, { orderId: f.orderId, lineId: f.line.id, expectedVersion: await v(), staff: butcher })).toEqual(locked);
    expect(await recordWeight(db, { orderId: f.orderId, lineId: f.line.id, actualG: 2500, expectedVersion: await v(), staff: butcher })).toEqual(locked);
  });

  it("an expired hold stops picking before any meat is cut", async () => {
    const f = await authorizedOrder(db, provider);
    const butcher = await makeStaff(db, "BUTCHER");
    await db.update(paymentIntent).set({ expiresAt: new Date(Date.now() - 60_000) }).where(eq(paymentIntent.orderId, f.orderId));
    expect(await startPicking(db, { orderId: f.orderId, staff: butcher, appUrl: APP })).toMatchObject({ ok: true, holdExpired: true });
    expect((await orderRow(f.orderId)).status).toBe("AUTH_EXPIRED");
    expect((await db.select().from(notification).where(eq(notification.orderId, f.orderId))).map((m) => m.templateKey)).toContain("order.reauth_required");
  });

  it("weighing and delivery actions are in the activity log", async () => {
    const { auditEvent } = await import("@/infra/db/schema");
    const f = await authorizedOrder(db, provider);
    const butcher = await makeStaff(db, "BUTCHER");
    await startPicking(db, { orderId: f.orderId, staff: butcher, appUrl: APP });
    await recordWeight(db, { orderId: f.orderId, lineId: f.line.id, actualG: 2500, expectedVersion: await versionOf(db, f.orderId), staff: butcher });
    await finishWeighing(db, provider, { orderId: f.orderId, expectedVersion: await versionOf(db, f.orderId), staff: butcher, appUrl: APP });
    await delivered(f.orderId);
    const actions = (await db.select().from(auditEvent)).map((a) => a.action);
    expect(actions).toEqual(expect.arrayContaining(["line.weigh", "delivery.dispatched", "delivery.delivered"]));
  });

  it("a window without room for the order's weight isn't offered and can't be chosen", async () => {
    const { changeWindow, rescheduleOptions } = await import("@/infra/orders/customer");
    const { makeSlot } = await import("./support/db");
    const f = await authorizedOrder(db, provider);
    const manager = await makeStaff(db, "MANAGER");
    const o = await orderRow(f.orderId);
    const heavy = await makeSlot(db, f.zone.id, { capacityWeightG: o.reservedWeightG - 1, startsAt: new Date(Date.now() + 72 * 3_600_000), endsAt: new Date(Date.now() + 75 * 3_600_000), cutoffAt: new Date(Date.now() + 70 * 3_600_000) });
    expect((await rescheduleOptions(db, { zoneId: f.zone.id, slotId: f.slot.id, cutAt: null, weightG: o.reservedWeightG })).map((w) => w.id)).not.toContain(heavy.id);
    expect(await changeWindow(db, { orderId: f.orderId, slotId: heavy.id, staff: manager, appUrl: APP })).toEqual({ ok: false, problem: { key: "SLOT_UNAVAILABLE" } });
  });
});
