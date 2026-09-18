import { asc, eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { cartLine, orderLine, product, stockItem } from "@/infra/db/schema";
import { reorderInto } from "@/infra/orders/reorder";
import * as w from "@/infra/orders/weighing";
import { createMockProvider } from "@/infra/payments/mock";
import { connectTestDb, makeCart, makeStaff, makeZone, truncateAll } from "./support/db";
import { APP, authorizedOrder, versionOf } from "./support/orders";

const { db, close } = connectTestDb();
const provider = createMockProvider(db, APP);
beforeEach(() => truncateAll(db));
afterAll(() => close());

const PHONE = "+972541234567";

const linesOf = (cartId: string) => db.select().from(cartLine).where(eq(cartLine.cartId, cartId));

describe("ordering a past order again", () => {
  it("puts the same cuts back in the cart, in the weight that actually arrived", async () => {
    const f = await authorizedOrder(db, provider);
    const butcher = await makeStaff(db, "BUTCHER");
    await w.startPicking(db, { orderId: f.orderId, staff: butcher, appUrl: APP });
    // Asked for 2.5 kg, the butcher cut 2.6 — that is what "the same again" means.
    await w.recordWeight(db, { orderId: f.orderId, lineId: f.line.id, actualG: 2600, expectedVersion: await versionOf(db, f.orderId), staff: butcher });
    await w.finishWeighing(db, provider, { orderId: f.orderId, expectedVersion: await versionOf(db, f.orderId), staff: butcher, appUrl: APP });

    const zone = await makeZone(db, { slug: `z-${Math.random().toString(36).slice(2, 7)}` });
    const cart = await makeCart(db, zone.id);
    const result = await reorderInto(cart.id, { orderNumber: f.order.orderNumber, phoneE164: PHONE, accessToken: null });

    expect(result).toMatchObject({ ok: true, count: 1 });
    expect(result.ok && result.lines.map((l) => ({ slug: l.slug, added: l.added }))).toEqual([{ slug: f.beef.product.slug, added: true }]);
    // 2,600 g rounds to the 250 g the butcher cuts in — and says so rather than changing it quietly.
    expect((await linesOf(cart.id)).map((l) => l.requestedG)).toEqual([2500]);
    expect(result.ok && result.lines[0].changed).toEqual({ fromG: 2600, toG: 2500 });
  });

  it("leaves the same cart whether it is pressed once or three times", async () => {
    const f = await authorizedOrder(db, provider);
    const zone = await makeZone(db, { slug: `z-${Math.random().toString(36).slice(2, 7)}` });
    const cart = await makeCart(db, zone.id);
    const again = () => reorderInto(cart.id, { orderNumber: f.order.orderNumber, phoneE164: PHONE, accessToken: null });

    expect((await again()).ok).toBe(true);
    expect((await again()).ok).toBe(true);
    expect((await again()).ok).toBe(true);
    expect((await linesOf(cart.id)).map((l) => l.requestedG)).toEqual([2500]);
  });

  it("is proved by the link even when someone else is signed in", async () => {
    const f = await authorizedOrder(db, provider);
    const zone = await makeZone(db, { slug: `z-${Math.random().toString(36).slice(2, 7)}` });
    const cart = await makeCart(db, zone.id);

    // A gift, or a household where one person checks out and another is signed in.
    expect((await reorderInto(cart.id, { orderNumber: f.order.orderNumber, phoneE164: "+972500000000", accessToken: f.order.accessToken })).ok).toBe(true);
  });

  it("replays the cuts in the order they were written", async () => {
    const f = await authorizedOrder(db, provider);
    const zone = await makeZone(db, { slug: `z-${Math.random().toString(36).slice(2, 7)}` });
    const cart = await makeCart(db, zone.id);
    const sorted = await db.select({ id: orderLine.id, sortOrder: orderLine.sortOrder }).from(orderLine).where(eq(orderLine.orderId, f.orderId)).orderBy(asc(orderLine.sortOrder));

    const result = await reorderInto(cart.id, { orderNumber: f.order.orderNumber, phoneE164: PHONE, accessToken: null });
    expect(result.ok && result.lines).toHaveLength(sorted.length);
  });

  it("refuses an order that is not yours, by phone or by link", async () => {
    const f = await authorizedOrder(db, provider);
    const zone = await makeZone(db, { slug: `z-${Math.random().toString(36).slice(2, 7)}` });
    const cart = await makeCart(db, zone.id);

    expect(await reorderInto(cart.id, { orderNumber: f.order.orderNumber, phoneE164: "+972500000000", accessToken: null })).toEqual({ ok: false, problem: { key: "NOT_FOUND" } });
    expect(await reorderInto(cart.id, { orderNumber: f.order.orderNumber, phoneE164: null, accessToken: "not-the-token" })).toEqual({ ok: false, problem: { key: "NOT_FOUND" } });
    expect(await reorderInto(cart.id, { orderNumber: f.order.orderNumber, phoneE164: null, accessToken: null })).toEqual({ ok: false, problem: { key: "NOT_FOUND" } });
    // The tracking link alone is proof enough, without signing in.
    expect((await reorderInto(cart.id, { orderNumber: f.order.orderNumber, phoneE164: null, accessToken: f.order.accessToken })).ok).toBe(true);
    expect(await linesOf(cart.id)).toHaveLength(1);
  });

  it("says which cut it could not add instead of quietly leaving it out", async () => {
    const f = await authorizedOrder(db, provider);
    await db.update(stockItem).set({ onHandG: 0 }).where(eq(stockItem.productId, f.beef.product.id));

    const zone = await makeZone(db, { slug: `z-${Math.random().toString(36).slice(2, 7)}` });
    const cart = await makeCart(db, zone.id);
    const result = await reorderInto(cart.id, { orderNumber: f.order.orderNumber, phoneE164: PHONE, accessToken: null });

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.problem.key === "NOTHING_TO_ADD" && result.problem.lines).toMatchObject([
      { slug: f.beef.product.slug, added: false, problem: { key: "OUT_OF_STOCK" } },
    ]);
    expect(await linesOf(cart.id)).toHaveLength(0);
  });

  it("leaves out a cut that never arrived", async () => {
    const f = await authorizedOrder(db, provider);
    const butcher = await makeStaff(db, "BUTCHER");
    await w.startPicking(db, { orderId: f.orderId, staff: butcher, appUrl: APP });
    await w.markShort(db, { orderId: f.orderId, lineId: f.line.id, expectedVersion: await versionOf(db, f.orderId), staff: butcher });

    const zone = await makeZone(db, { slug: `z-${Math.random().toString(36).slice(2, 7)}` });
    const cart = await makeCart(db, zone.id);
    const result = await reorderInto(cart.id, { orderNumber: f.order.orderNumber, phoneE164: PHONE, accessToken: null });

    // Nothing arrived is not the same as nothing being available — the customer is told which.
    expect(result).toEqual({ ok: false, problem: { key: "NOTHING_ARRIVED" } });
  });

  it("does not offer a cut the shop no longer sells", async () => {
    const f = await authorizedOrder(db, provider);
    await db.update(product).set({ published: false }).where(eq(product.id, f.beef.product.id));

    const zone = await makeZone(db, { slug: `z-${Math.random().toString(36).slice(2, 7)}` });
    const cart = await makeCart(db, zone.id);
    const result = await reorderInto(cart.id, { orderNumber: f.order.orderNumber, phoneE164: PHONE, accessToken: null });

    expect(result.ok === false && result.problem.key === "NOTHING_TO_ADD" && result.problem.lines[0].problem).toEqual({ key: "UNAVAILABLE" });
  });
});
