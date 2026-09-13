import { and, eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { deliverySlot, mockPspTransaction, notification, order, orderLine, paymentIntent, stockItem } from "@/infra/db/schema";
import { cancelByCustomer, decideExtra, expireApprovals, moveDelivery, rescheduleDelivery, rescheduleOptions } from "@/infra/orders/customer";
import { driverAction, refundOrder, shopDecision } from "@/infra/orders/delivery";
import { askCustomer, finishWeighing, markPacked, markShort, recordWeight, startPicking, undoLine } from "@/infra/orders/weighing";
import { createMockProvider } from "@/infra/payments/mock";
import { connectTestDb, makeSlot, makeStaff, truncateAll } from "./support/db";
import { APP, authorizedOrder, versionOf } from "./support/orders";

const { db, close } = connectTestDb();
const provider = createMockProvider(db, APP);
beforeEach(() => truncateAll(db));
afterAll(() => close());

const orderRow = async (id: string) => (await db.select().from(order).where(eq(order.id, id)))[0];

async function askedAbout(actualG = 3400) {
  const f = await authorizedOrder(db, provider);
  const butcher = await makeStaff(db, "BUTCHER");
  await startPicking(db, { orderId: f.orderId, staff: butcher, appUrl: APP });
  const asked = await askCustomer(db, { orderId: f.orderId, lineId: f.line.id, actualG, expectedVersion: await versionOf(db, f.orderId), staff: butcher, appUrl: APP, locale: "he" });
  if (!asked.ok) throw new Error(asked.problem.key);
  return { ...f, butcher, asked };
}

describe("asking the customer about extra weight", () => {
  it("sends a message with the numbers, freezes the line, and the approved extra is charged separately", async () => {
    const f = await askedAbout(3400);
    expect(f.asked.extraAgorot).toBe(57_460 - 46_475);
    expect((await orderRow(f.orderId)).status).toBe("AWAITING_CUSTOMER_APPROVAL");
    const [msg] = await db.select().from(notification).where(and(eq(notification.orderId, f.orderId), eq(notification.templateKey, "order.over_tolerance")));
    expect(msg.renderedBody).toContain("3.4 ק״ג");
    expect(msg.renderedBody).toContain("2.75 ק״ג");
    expect(msg.renderedBody).toContain("109.85");

    expect(await recordWeight(db, { orderId: f.orderId, lineId: f.line.id, actualG: 2500, expectedVersion: await versionOf(db, f.orderId), staff: f.butcher })).toEqual({
      ok: false,
      problem: { key: "AWAITING_CUSTOMER" },
    });
    expect(await decideExtra(db, provider, { orderNumber: f.order.orderNumber, token: "wrong-token-xxxxxxxxxxxx", decision: "APPROVE", appUrl: APP })).toEqual({
      ok: false,
      problem: { key: "NOT_FOUND" },
    });

    expect(await decideExtra(db, provider, { orderNumber: f.order.orderNumber, token: f.order.accessToken, decision: "APPROVE", appUrl: APP })).toEqual({ ok: true, outcome: "APPROVED" });
    const after = await orderRow(f.orderId);
    expect(after).toMatchObject({ status: "PICKING", extraChargedAgorot: 10_985, authorizationCeilingAgorot: 46_500 + 10_985 });
    expect((await db.select().from(orderLine).where(eq(orderLine.id, f.line.id)))[0]).toMatchObject({ actualG: 3400, finalAgorot: 57_460, status: "WEIGHED", pendingActualG: null });
    expect(await db.select().from(paymentIntent).where(and(eq(paymentIntent.orderId, f.orderId), eq(paymentIntent.purpose, "EXTRA")))).toHaveLength(1);

    const done = await finishWeighing(db, provider, { orderId: f.orderId, expectedVersion: await versionOf(db, f.orderId), staff: f.butcher, appUrl: APP });
    expect(done).toMatchObject({ ok: true, capturedAgorot: 57_460 });
    const txs = await db.select().from(mockPspTransaction);
    // The original hold is charged only for what it covers; the extra was its own charge.
    expect(txs.find((t) => t.mode === "AUTHORIZE")!.capturedAgorot).toBe(46_475);
    expect(txs.find((t) => t.scenario === "TOKEN_CHARGE")!.capturedAgorot).toBe(10_985);
  });

  it("while waiting, the frozen line can't be changed and the order can't be finished", async () => {
    const f = await askedAbout();
    const v = async () => versionOf(db, f.orderId);
    expect(await markShort(db, { orderId: f.orderId, lineId: f.line.id, expectedVersion: await v(), staff: f.butcher })).toEqual({ ok: false, problem: { key: "AWAITING_CUSTOMER" } });
    expect(await undoLine(db, { orderId: f.orderId, lineId: f.line.id, expectedVersion: await v(), staff: f.butcher })).toEqual({ ok: false, problem: { key: "AWAITING_CUSTOMER" } });
    const done = await finishWeighing(db, provider, { orderId: f.orderId, expectedVersion: await v(), staff: f.butcher, appUrl: APP });
    expect(done).toMatchObject({ ok: false, problem: { key: "WRONG_STATE", status: "AWAITING_CUSTOMER_APPROVAL" } });
  });

  it("if the shop cancels after the customer approved an extra, the extra is refunded and the message says so", async () => {
    const f = await askedAbout(3400);
    await decideExtra(db, provider, { orderNumber: f.order.orderNumber, token: f.order.accessToken, decision: "APPROVE", appUrl: APP });
    const manager = await makeStaff(db, "MANAGER");
    expect(await shopDecision(db, provider, { orderId: f.orderId, decision: "CANCEL", reason: "הבשר לא עמד בבדיקת איכות", staff: manager, appUrl: APP })).toEqual({ ok: true });
    expect((await orderRow(f.orderId)).status).toBe("CANCELLED_BY_SHOP");
    const extra = (await db.select().from(paymentIntent).where(and(eq(paymentIntent.orderId, f.orderId), eq(paymentIntent.purpose, "EXTRA"))))[0];
    expect(extra.status).toBe("VOIDED");
    const tokenTx = (await db.select().from(mockPspTransaction)).find((t) => t.scenario === "TOKEN_CHARGE")!;
    expect(tokenTx.refundedAgorot).toBe(10_985);
    const [msg] = await db.select().from(notification).where(and(eq(notification.orderId, f.orderId), eq(notification.templateKey, "order.cancelled_by_shop_refunded")));
    expect(msg.renderedBody).toContain("109.85");
    expect(await db.select().from(notification).where(and(eq(notification.orderId, f.orderId), eq(notification.templateKey, "order.cancelled_by_shop")))).toHaveLength(0);
  });

  it("choosing to trim sends the order back to the butcher to weigh again within range", async () => {
    const f = await askedAbout();
    expect(await decideExtra(db, provider, { orderNumber: f.order.orderNumber, token: f.order.accessToken, decision: "TRIM", appUrl: APP })).toEqual({ ok: true, outcome: "TRIMMED" });
    expect((await orderRow(f.orderId)).status).toBe("PICKING");
    expect((await recordWeight(db, { orderId: f.orderId, lineId: f.line.id, actualG: 2740, expectedVersion: await versionOf(db, f.orderId), staff: f.butcher })).ok).toBe(true);
  });

  it("no answer by the deadline means trim", async () => {
    const f = await askedAbout();
    expect(await expireApprovals(db, { appUrl: APP, now: new Date(Date.now() + 3 * 3_600_000) })).toBe(1);
    expect((await orderRow(f.orderId)).status).toBe("PICKING");
    expect(await db.select().from(notification).where(and(eq(notification.orderId, f.orderId), eq(notification.templateKey, "order.trimmed")))).toHaveLength(1);
    expect(await decideExtra(db, provider, { orderNumber: f.order.orderNumber, token: f.order.accessToken, decision: "APPROVE", appUrl: APP })).toEqual({
      ok: false,
      problem: { key: "NOT_ALLOWED_NOW" },
    });
  });
});

describe("customer cancellation", () => {
  it("before picking: releases the window and stock and voids the hold", async () => {
    const f = await authorizedOrder(db, provider);
    expect(await cancelByCustomer(db, provider, { orderNumber: f.order.orderNumber, token: f.order.accessToken, appUrl: APP })).toEqual({ ok: true });
    expect((await orderRow(f.orderId)).status).toBe("CANCELLED_BY_CUSTOMER");
    expect((await db.select().from(deliverySlot).where(eq(deliverySlot.id, f.slot.id)))[0].reservedOrders).toBe(0);
    expect((await db.select().from(stockItem).where(eq(stockItem.productId, f.beef.product.id)))[0].reservedG).toBe(0);
    expect((await db.select().from(mockPspTransaction))[0].status).toBe("VOIDED");
  });

  it("once the butcher has started, the customer can't cancel online", async () => {
    const f = await authorizedOrder(db, provider);
    await startPicking(db, { orderId: f.orderId, staff: await makeStaff(db, "BUTCHER"), appUrl: APP });
    expect(await cancelByCustomer(db, provider, { orderNumber: f.order.orderNumber, token: f.order.accessToken, appUrl: APP })).toEqual({ ok: false, problem: { key: "NOT_ALLOWED_NOW" } });
  });
});

async function packed() {
  const f = await authorizedOrder(db, provider, "APPROVE", 3);
  const butcher = await makeStaff(db, "BUTCHER");
  await startPicking(db, { orderId: f.orderId, staff: butcher, appUrl: APP });
  await recordWeight(db, { orderId: f.orderId, lineId: f.line.id, actualG: 2500, expectedVersion: await versionOf(db, f.orderId), staff: butcher });
  await finishWeighing(db, provider, { orderId: f.orderId, expectedVersion: await versionOf(db, f.orderId), staff: butcher, appUrl: APP });
  await markPacked(db, { orderId: f.orderId, staff: butcher, appUrl: APP });
  return { ...f, butcher, driver: await makeStaff(db, "DRIVER"), manager: await makeStaff(db, "MANAGER") };
}

describe("delivery run", () => {
  it("not home → customer reschedules within the cold-chain limit → delivered", async () => {
    const f = await packed();
    expect(await driverAction(db, { orderId: f.orderId, event: "DISPATCHED", staff: f.driver, appUrl: APP })).toEqual({ ok: true });
    expect(await driverAction(db, { orderId: f.orderId, event: "NOT_HOME", staff: f.driver, appUrl: APP })).toEqual({ ok: true });

    const later = await makeSlot(db, f.zone.id, { startsAt: new Date(Date.now() + 3 * 3_600_000), endsAt: new Date(Date.now() + 5 * 3_600_000), cutoffAt: new Date(Date.now() + 2 * 3_600_000) });
    const tooLate = await makeSlot(db, f.zone.id, { startsAt: new Date(Date.now() + 5 * 3_600_000), endsAt: new Date(Date.now() + 8 * 3_600_000), cutoffAt: new Date(Date.now() + 4 * 3_600_000) });
    const offered = await rescheduleOptions(db, { ...(await orderRow(f.orderId)), cutAt: (await orderRow(f.orderId)).capturedAt });
    // Only windows that keep the cold chain, and never the window that just failed.
    expect(offered.map((w) => w.id)).toEqual([later.id]);
    expect(await rescheduleDelivery(db, { orderNumber: f.order.orderNumber, token: f.order.accessToken, slotId: tooLate.id, appUrl: APP })).toEqual({ ok: false, problem: { key: "COLD_CHAIN_EXCEEDED" } });
    expect(await rescheduleDelivery(db, { orderNumber: f.order.orderNumber, token: f.order.accessToken, slotId: f.slot.id, appUrl: APP })).toEqual({ ok: false, problem: { key: "SLOT_UNAVAILABLE" } });
    expect(await rescheduleDelivery(db, { orderNumber: f.order.orderNumber, token: f.order.accessToken, slotId: later.id, appUrl: APP })).toEqual({ ok: true });
    const o = await orderRow(f.orderId);
    expect(o).toMatchObject({ status: "RESCHEDULED", slotId: later.id });
    expect((await db.select().from(deliverySlot).where(eq(deliverySlot.id, later.id)))[0].reservedOrders).toBe(1);
    expect((await db.select().from(deliverySlot).where(eq(deliverySlot.id, f.slot.id)))[0].reservedOrders).toBe(0);

    await driverAction(db, { orderId: f.orderId, event: "DISPATCHED", staff: f.driver, appUrl: APP });
    expect(await driverAction(db, { orderId: f.orderId, event: "DELIVERED", staff: f.driver, appUrl: APP })).toEqual({ ok: true });
    expect((await orderRow(f.orderId)).deliveryAttempts).toBe(2);
  });

  it("a manager can rebook for the customer by phone; a driver can't", async () => {
    const f = await packed();
    await driverAction(db, { orderId: f.orderId, event: "DISPATCHED", staff: f.driver, appUrl: APP });
    await driverAction(db, { orderId: f.orderId, event: "NOT_HOME", staff: f.driver, appUrl: APP });
    const later = await makeSlot(db, f.zone.id, { startsAt: new Date(Date.now() + 2 * 3_600_000), endsAt: new Date(Date.now() + 4 * 3_600_000), cutoffAt: new Date(Date.now() + 3_600_000) });
    expect(await moveDelivery(db, { orderId: f.orderId, slotId: later.id, actor: "DRIVER", actorId: f.driver.id, appUrl: APP })).toEqual({ ok: false, problem: { key: "NOT_ALLOWED_NOW" } });
    expect((await db.select().from(deliverySlot).where(eq(deliverySlot.id, later.id)))[0].reservedOrders).toBe(0);
    const manager = await makeStaff(db, "MANAGER");
    expect(await moveDelivery(db, { orderId: f.orderId, slotId: later.id, actor: "MANAGER", actorId: manager.id, appUrl: APP })).toEqual({ ok: true });
    expect(await orderRow(f.orderId)).toMatchObject({ status: "RESCHEDULED", slotId: later.id });
  });

  it("refuses to reschedule meat that has been out of the cold room too long", async () => {
    const f = await packed();
    await driverAction(db, { orderId: f.orderId, event: "DISPATCHED", staff: f.driver, appUrl: APP });
    await driverAction(db, { orderId: f.orderId, event: "NOT_HOME", staff: f.driver, appUrl: APP });
    const later = await makeSlot(db, f.zone.id, { startsAt: new Date(Date.now() + 20 * 3_600_000), endsAt: new Date(Date.now() + 22 * 3_600_000), cutoffAt: new Date(Date.now() + 19 * 3_600_000) });
    expect(
      await rescheduleDelivery(db, { orderNumber: f.order.orderNumber, token: f.order.accessToken, slotId: later.id, appUrl: APP, now: new Date(Date.now() + 8 * 3_600_000) }),
    ).toEqual({ ok: false, problem: { key: "COLD_CHAIN_EXCEEDED" } });
    expect((await db.select().from(deliverySlot).where(eq(deliverySlot.id, later.id)))[0].reservedOrders).toBe(0);
  });

  it("a driver cannot refund; a manager refunds with a reason, partly then fully", async () => {
    const f = await packed();
    await driverAction(db, { orderId: f.orderId, event: "DISPATCHED", staff: f.driver, appUrl: APP });
    await driverAction(db, { orderId: f.orderId, event: "DELIVERED", staff: f.driver, appUrl: APP });

    expect(await refundOrder(db, provider, { orderId: f.orderId, amountAgorot: 1000, reason: "Customer complained about the fat", staff: f.driver, appUrl: APP })).toEqual({
      ok: false,
      problem: { key: "NOT_PERMITTED" },
    });
    expect(await refundOrder(db, provider, { orderId: f.orderId, amountAgorot: 1000, reason: "fat", staff: f.manager, appUrl: APP })).toEqual({ ok: false, problem: { key: "REASON_REQUIRED" } });
    expect(await refundOrder(db, provider, { orderId: f.orderId, amountAgorot: 999_999, reason: "Customer complained about the fat", staff: f.manager, appUrl: APP })).toEqual({
      ok: false,
      problem: { key: "INVALID_AMOUNT", maxAgorot: 42_250 },
    });

    expect(await refundOrder(db, provider, { orderId: f.orderId, amountAgorot: 5_000, reason: "Customer complained about the fat", staff: f.manager, appUrl: APP })).toEqual({ ok: true });
    expect(await orderRow(f.orderId)).toMatchObject({ status: "PARTIALLY_REFUNDED", refundedAgorot: 5_000 });
    expect(await refundOrder(db, provider, { orderId: f.orderId, amountAgorot: 37_250, reason: "Goodwill: refund the rest of the order", staff: f.manager, appUrl: APP })).toEqual({ ok: true });
    expect(await orderRow(f.orderId)).toMatchObject({ status: "REFUNDED", refundedAgorot: 42_250 });
    expect((await db.select().from(mockPspTransaction).where(eq(mockPspTransaction.mode, "AUTHORIZE")))[0].refundedAgorot).toBe(42_250);
  });
});

describe("manager decisions", () => {
  it("cancelling after weighing puts the cut meat back in stock, frees the window and voids the hold", async () => {
    const f = await authorizedOrder(db, provider, "APPROVE_CAPTURE_FAILS");
    const butcher = await makeStaff(db, "BUTCHER");
    const manager = await makeStaff(db, "MANAGER");
    await startPicking(db, { orderId: f.orderId, staff: butcher, appUrl: APP });
    await recordWeight(db, { orderId: f.orderId, lineId: f.line.id, actualG: 2600, expectedVersion: await versionOf(db, f.orderId), staff: butcher });
    await finishWeighing(db, provider, { orderId: f.orderId, expectedVersion: await versionOf(db, f.orderId), staff: butcher, appUrl: APP });
    expect((await orderRow(f.orderId)).status).toBe("CAPTURE_FAILED");
    expect((await db.select().from(stockItem).where(eq(stockItem.productId, f.beef.product.id)))[0].onHandG).toBe(40_000 - 2600);


    expect(await shopDecision(db, provider, { orderId: f.orderId, decision: "CANCEL", reason: "short", staff: manager, appUrl: APP })).toEqual({ ok: false, problem: { key: "REASON_REQUIRED" } });
    expect(await shopDecision(db, provider, { orderId: f.orderId, decision: "CANCEL", reason: "Card keeps failing, customer unreachable", staff: butcher, appUrl: APP })).toEqual({
      ok: false,
      problem: { key: "NOT_PERMITTED" },
    });
    expect(await shopDecision(db, provider, { orderId: f.orderId, decision: "CANCEL", reason: "Card keeps failing, customer unreachable", staff: manager, appUrl: APP })).toEqual({ ok: true });
    expect((await orderRow(f.orderId)).status).toBe("CANCELLED_BY_SHOP");
    expect((await db.select().from(stockItem).where(eq(stockItem.productId, f.beef.product.id)))[0]).toMatchObject({ onHandG: 40_000, reservedG: 0 });
    expect((await db.select().from(deliverySlot).where(eq(deliverySlot.id, f.slot.id)))[0].reservedOrders).toBe(0);
    expect((await db.select().from(mockPspTransaction))[0].status).toBe("VOIDED");
  });

  it("force dispatch after a failed charge is flagged as unpaid", async () => {
    const f = await authorizedOrder(db, provider, "APPROVE_CAPTURE_FAILS");
    const butcher = await makeStaff(db, "BUTCHER");
    const manager = await makeStaff(db, "MANAGER");
    await startPicking(db, { orderId: f.orderId, staff: butcher, appUrl: APP });
    await recordWeight(db, { orderId: f.orderId, lineId: f.line.id, actualG: 2500, expectedVersion: await versionOf(db, f.orderId), staff: butcher });
    await finishWeighing(db, provider, { orderId: f.orderId, expectedVersion: await versionOf(db, f.orderId), staff: butcher, appUrl: APP });

    expect(await shopDecision(db, provider, { orderId: f.orderId, decision: "FORCE_DISPATCH", reason: "Regular customer, will pay cash on delivery", staff: manager, appUrl: APP })).toEqual({ ok: true });
    expect(await orderRow(f.orderId)).toMatchObject({ status: "PACKED", unpaidDispatch: true });
  });
});
