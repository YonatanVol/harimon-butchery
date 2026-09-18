import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { cartLine } from "@/infra/db/schema";
import { reorderInto } from "@/infra/orders/reorder";
import * as w from "@/infra/orders/weighing";
import { createMockProvider } from "@/infra/payments/mock";
import { connectTestDb, makeCart, makeStaff, makeZone, truncateAll } from "./support/db";
import { APP, authorizedOrder, paidPackageOrder, versionOf } from "./support/orders";

const { db, close } = connectTestDb();
const provider = createMockProvider(db, APP);
beforeEach(() => truncateAll(db));
afterAll(() => close());

const PHONE = "+972541234567";
const linesOf = (cartId: string) => db.select().from(cartLine).where(eq(cartLine.cartId, cartId));

describe("scratch", () => {
  it("clicking reorder twice doubles the weight", async () => {
    const f = await authorizedOrder(db, provider);
    const butcher = await makeStaff(db, "BUTCHER");
    await w.startPicking(db, { orderId: f.orderId, staff: butcher, appUrl: APP });
    await w.recordWeight(db, { orderId: f.orderId, lineId: f.line.id, actualG: 2600, expectedVersion: await versionOf(db, f.orderId), staff: butcher });
    await w.finishWeighing(db, provider, { orderId: f.orderId, expectedVersion: await versionOf(db, f.orderId), staff: butcher, appUrl: APP });

    const zone = await makeZone(db, { slug: `z-${Math.random().toString(36).slice(2, 7)}` });
    const cart = await makeCart(db, zone.id);
    const a = await reorderInto(cart.id, { orderNumber: f.order.orderNumber, phoneE164: PHONE, accessToken: null });
    const b = await reorderInto(cart.id, { orderNumber: f.order.orderNumber, phoneE164: PHONE, accessToken: null });
    console.log("first:", JSON.stringify(a));
    console.log("second:", JSON.stringify(b));
    console.log("cart lines after two reorders:", JSON.stringify((await linesOf(cart.id)).map((l) => ({ requestedG: l.requestedG, quantity: l.quantity }))));
  });

  it("package order reorders", async () => {
    const f = await paidPackageOrder(db, provider);
    const zone = await makeZone(db, { slug: `z-${Math.random().toString(36).slice(2, 7)}` });
    const cart = await makeCart(db, zone.id);
    const r = await reorderInto(cart.id, { orderNumber: f.order.orderNumber, phoneE164: PHONE, accessToken: null });
    console.log("package reorder:", JSON.stringify(r));
    console.log("package cart lines:", JSON.stringify((await linesOf(cart.id)).map((l) => ({ q: l.quantity, g: l.requestedG }))));
  });

  it("signed-in as someone else but holding a valid link", async () => {
    const f = await authorizedOrder(db, provider);
    const zone = await makeZone(db, { slug: `z-${Math.random().toString(36).slice(2, 7)}` });
    const cart = await makeCart(db, zone.id);
    const r = await reorderInto(cart.id, { orderNumber: f.order.orderNumber, phoneE164: "+972500000000", accessToken: f.order.accessToken });
    console.log("other phone + right token:", JSON.stringify(r));
  });
});
