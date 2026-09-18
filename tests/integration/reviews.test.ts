import { and, eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { order, orderLine, productReview } from "@/infra/db/schema";
import { driverAction } from "@/infra/orders/delivery";
import * as w from "@/infra/orders/weighing";
import { createMockProvider } from "@/infra/payments/mock";
import { listForModeration, moderateReview, replyToReview, reviewableFor, reviewsFor, submitReview, summaryFor } from "@/infra/reviews/repository";
import { connectTestDb, makeStaff, truncateAll } from "./support/db";
import { APP, authorizedOrder, versionOf } from "./support/orders";

const { db, close } = connectTestDb();
const provider = createMockProvider(db, APP);
beforeEach(() => truncateAll(db));
afterAll(() => close());

const PHONE = "+972541234567";
const BODY = "צלינו על גריל, יצא בדיוק כמו שרצינו. נזמין שוב.";

/** An order taken all the way through the real flow to the customer's door. */
async function deliveredOrder() {
  const f = await authorizedOrder(db, provider);
  const butcher = await makeStaff(db, "BUTCHER");
  const packer = await makeStaff(db, "PACKER");
  const driver = await makeStaff(db, "DRIVER");

  await w.startPicking(db, { orderId: f.orderId, staff: butcher, appUrl: APP });
  await w.recordWeight(db, { orderId: f.orderId, lineId: f.line.id, actualG: f.line.estimatedG!, expectedVersion: await versionOf(db, f.orderId), staff: butcher, confirmUnder: true });
  await w.finishWeighing(db, provider, { orderId: f.orderId, expectedVersion: await versionOf(db, f.orderId), staff: butcher, appUrl: APP });
  await w.markPacked(db, { orderId: f.orderId, staff: packer, appUrl: APP });
  await driverAction(db, { orderId: f.orderId, event: "DISPATCHED", staff: driver, appUrl: APP });
  await driverAction(db, { orderId: f.orderId, event: "DELIVERED", staff: driver, appUrl: APP });

  return f;
}

describe("writing a review", () => {
  it("takes one review per cut per order, from the customer whose order it was", async () => {
    const f = await deliveredOrder();

    expect(await submitReview(db, { phoneE164: PHONE, orderId: f.orderId, productSlug: f.beef.product.slug, rating: 5, body: BODY, locale: "he" })).toEqual({ ok: true });
    // The same cut on the same order, a second time.
    expect(await submitReview(db, { phoneE164: PHONE, orderId: f.orderId, productSlug: f.beef.product.slug, rating: 4, body: BODY, locale: "he" })).toEqual({
      ok: false,
      problem: { key: "ALREADY_REVIEWED" },
    });
    // Someone else's phone, and a cut that order never contained.
    expect(await submitReview(db, { phoneE164: "+972500000000", orderId: f.orderId, productSlug: f.beef.product.slug, rating: 5, body: BODY, locale: "he" })).toEqual({
      ok: false,
      problem: { key: "NOT_FOUND" },
    });
    expect(await submitReview(db, { phoneE164: PHONE, orderId: f.orderId, productSlug: f.cheaper.product.slug, rating: 5, body: BODY, locale: "he" })).toEqual({
      ok: false,
      problem: { key: "NOT_FOUND" },
    });

    const [saved] = await db.select().from(productReview);
    expect(saved.status).toBe("PENDING");
    expect(saved.displayName).toBe("דנה כ.");
    expect(saved.rating).toBe(5);
  });

  it("refuses an order that has not been delivered, and one delivered too long ago", async () => {
    const f = await authorizedOrder(db, provider);
    expect(await submitReview(db, { phoneE164: PHONE, orderId: f.orderId, productSlug: f.beef.product.slug, rating: 5, body: BODY, locale: "he" })).toEqual({
      ok: false,
      problem: { key: "NOT_DELIVERED" },
    });

    await db.update(order).set({ status: "DELIVERED", deliveredAt: new Date(Date.now() - 200 * 86_400_000) }).where(eq(order.id, f.orderId));
    expect(await submitReview(db, { phoneE164: PHONE, orderId: f.orderId, productSlug: f.beef.product.slug, rating: 5, body: BODY, locale: "he" })).toEqual({
      ok: false,
      problem: { key: "WINDOW_CLOSED", days: 90 },
    });
  });

  it("refuses a rating or a body the shop would not show", async () => {
    const f = await deliveredOrder();
    const send = (rating: number, body: string) => submitReview(db, { phoneE164: PHONE, orderId: f.orderId, productSlug: f.beef.product.slug, rating, body, locale: "he" });

    expect((await send(0, BODY)).ok).toBe(false);
    expect((await send(6, BODY)).ok).toBe(false);
    expect((await send(4, "טעים")).ok).toBe(false);
    expect((await send(4, "א".repeat(601))).ok).toBe(false);
    expect(await db.select().from(productReview)).toHaveLength(0);
  });
});

describe("a cut that never reached the kitchen", () => {
  it("cannot be reviewed when it was short, and is never offered", async () => {
    const f = await authorizedOrder(db, provider);
    const butcher = await makeStaff(db, "BUTCHER");
    const packer = await makeStaff(db, "PACKER");
    const driver = await makeStaff(db, "DRIVER");

    await w.startPicking(db, { orderId: f.orderId, staff: butcher, appUrl: APP });
    expect((await w.markShort(db, { orderId: f.orderId, lineId: f.line.id, expectedVersion: await versionOf(db, f.orderId), staff: butcher })).ok).toBe(true);
    await w.finishWeighing(db, provider, { orderId: f.orderId, expectedVersion: await versionOf(db, f.orderId), staff: butcher, appUrl: APP });
    await w.markPacked(db, { orderId: f.orderId, staff: packer, appUrl: APP });
    await driverAction(db, { orderId: f.orderId, event: "DISPATCHED", staff: driver, appUrl: APP });
    await driverAction(db, { orderId: f.orderId, event: "DELIVERED", staff: driver, appUrl: APP });

    expect(await reviewableFor(db, PHONE)).toEqual([]);
    expect(await submitReview(db, { phoneE164: PHONE, orderId: f.orderId, productSlug: f.beef.product.slug, rating: 5, body: BODY, locale: "he" })).toEqual({
      ok: false,
      problem: { key: "NOT_FOUND" },
    });
  });

  it("cannot be reviewed when it was swapped for something else — but the replacement can", async () => {
    const f = await authorizedOrder(db, provider);
    const butcher = await makeStaff(db, "BUTCHER");
    const packer = await makeStaff(db, "PACKER");
    const driver = await makeStaff(db, "DRIVER");

    await w.startPicking(db, { orderId: f.orderId, staff: butcher, appUrl: APP });
    expect((await w.substituteLine(db, { orderId: f.orderId, lineId: f.line.id, variantId: f.cheaper.variant.id, expectedVersion: await versionOf(db, f.orderId), staff: butcher })).ok).toBe(true);
    const [replacement] = await db.select().from(orderLine).where(and(eq(orderLine.orderId, f.orderId), eq(orderLine.status, "PENDING")));
    await w.recordWeight(db, { orderId: f.orderId, lineId: replacement.id, actualG: 2500, expectedVersion: await versionOf(db, f.orderId), staff: butcher });
    await w.finishWeighing(db, provider, { orderId: f.orderId, expectedVersion: await versionOf(db, f.orderId), staff: butcher, appUrl: APP });
    await w.markPacked(db, { orderId: f.orderId, staff: packer, appUrl: APP });
    await driverAction(db, { orderId: f.orderId, event: "DISPATCHED", staff: driver, appUrl: APP });
    await driverAction(db, { orderId: f.orderId, event: "DELIVERED", staff: driver, appUrl: APP });

    // The cut that was ordered never arrived; the one that did is the one to write about.
    expect((await reviewableFor(db, PHONE)).map((r) => r.slug)).toEqual([f.cheaper.product.slug]);
    expect(await submitReview(db, { phoneE164: PHONE, orderId: f.orderId, productSlug: f.beef.product.slug, rating: 5, body: BODY, locale: "he" })).toEqual({
      ok: false,
      problem: { key: "NOT_FOUND" },
    });
    expect(await submitReview(db, { phoneE164: PHONE, orderId: f.orderId, productSlug: f.cheaper.product.slug, rating: 5, body: BODY, locale: "he" })).toEqual({ ok: true });
  });
});

describe("what the shop shows", () => {
  it("shows nothing until a staff member publishes it, then counts it everywhere", async () => {
    const f = await deliveredOrder();
    const manager = await makeStaff(db, "MANAGER");
    await submitReview(db, { phoneE164: PHONE, orderId: f.orderId, productSlug: f.beef.product.slug, rating: 4, body: BODY, locale: "he" });

    expect(await reviewsFor(db, f.beef.product.id)).toHaveLength(0);
    expect((await summaryFor(db, f.beef.product.id)).count).toBe(0);
    expect((await listForModeration(db, "PENDING")).map((r) => r.body)).toEqual([BODY]);

    const [pending] = await db.select().from(productReview);
    expect(await moderateReview(db, { id: pending.id, staffId: manager.id, decision: "PUBLISHED", note: null })).toMatchObject({ slug: f.beef.product.slug });

    expect(await reviewsFor(db, f.beef.product.id)).toHaveLength(1);
    expect(await summaryFor(db, f.beef.product.id)).toEqual({ count: 1, averageTenths: 40, distribution: { 1: 0, 2: 0, 3: 0, 4: 1, 5: 0 } });

    // Rejecting takes it straight back off the site.
    expect(await moderateReview(db, { id: pending.id, staffId: manager.id, decision: "REJECTED", note: "  לא על הנתח  " })).toMatchObject({ slug: f.beef.product.slug });
    expect(await reviewsFor(db, f.beef.product.id)).toHaveLength(0);
    expect((await db.select().from(productReview))[0].moderationNote).toBe("לא על הנתח");
  });

  it("keeps the butcher's reply with the review, and lets it be taken back", async () => {
    const f = await deliveredOrder();
    const manager = await makeStaff(db, "MANAGER");
    await submitReview(db, { phoneE164: PHONE, orderId: f.orderId, productSlug: f.beef.product.slug, rating: 5, body: BODY, locale: "he" });
    const [saved] = await db.select().from(productReview);
    await moderateReview(db, { id: saved.id, staffId: manager.id, decision: "PUBLISHED", note: null });

    expect(await replyToReview(db, { id: saved.id, body: "תודה רבה, נשמח לראותכם שוב." })).toMatchObject({ slug: f.beef.product.slug });
    const [shown] = await reviewsFor(db, f.beef.product.id);
    expect(shown.replyBody).toBe("תודה רבה, נשמח לראותכם שוב.");
    expect(shown.repliedAt).not.toBeNull();

    // Editing the wording keeps the date the reply was first written.
    const firstReplyAt = (await reviewsFor(db, f.beef.product.id))[0].repliedAt;
    await replyToReview(db, { id: saved.id, body: "תודה רבה, נשמח לראותכם שוב אצלנו." });
    expect((await reviewsFor(db, f.beef.product.id))[0].repliedAt).toEqual(firstReplyAt);

    expect(await replyToReview(db, { id: saved.id, body: "   " })).toMatchObject({ slug: f.beef.product.slug });
    const [cleared] = await reviewsFor(db, f.beef.product.id);
    expect(cleared.replyBody).toBeNull();
    expect(cleared.repliedAt).toBeNull();
  });
});

describe("what a customer is invited to review", () => {
  it("lists a delivered cut once, and drops it as soon as it has been reviewed", async () => {
    const f = await deliveredOrder();

    const before = await reviewableFor(db, PHONE);
    expect(before.map((r) => r.slug)).toEqual([f.beef.product.slug]);
    expect(before[0].orderNumber).toBe(f.order.orderNumber);

    await submitReview(db, { phoneE164: PHONE, orderId: f.orderId, productSlug: f.beef.product.slug, rating: 5, body: BODY, locale: "he" });
    expect(await reviewableFor(db, PHONE)).toEqual([]);
  });

  it("invites no one whose order is still on its way", async () => {
    await authorizedOrder(db, provider);
    expect(await reviewableFor(db, PHONE)).toEqual([]);
  });
});
