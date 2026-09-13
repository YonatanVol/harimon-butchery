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
