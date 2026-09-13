import { and, eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { interestSignup, notification, stockItem } from "@/infra/db/schema";
import { notifyAreaOpened, notifyBackInStock, signUpForArea, signUpForRestock } from "@/infra/interest/signups";
import { cancelByCustomer } from "@/infra/orders/customer";
import { createMockProvider } from "@/infra/payments/mock";
import { connectTestDb, makeWeightProduct, makeZone, truncateAll } from "./support/db";
import { APP, authorizedOrder } from "./support/orders";

const { db, close } = connectTestDb();
const provider = createMockProvider(db, APP);
beforeEach(() => truncateAll(db));
afterAll(() => close());

const sent = (key: string) => db.select().from(notification).where(eq(notification.templateKey, key));

describe("tell me when it's back", () => {
  it("only signs up for something sold out, once per phone, mobiles only", async () => {
    const p = await makeWeightProduct(db, { onHandG: 40_000 });
    expect(await signUpForRestock(db, { productId: p.product.id, phone: "054-123 4567", locale: "he" })).toEqual({ ok: false, problem: { key: "IN_STOCK" } });

    await db.update(stockItem).set({ onHandG: 100 }).where(eq(stockItem.productId, p.product.id));
    expect(await signUpForRestock(db, { productId: p.product.id, phone: "03-512 3456", locale: "he" })).toEqual({ ok: false, problem: { key: "PHONE_NOT_MOBILE" } });
    expect(await signUpForRestock(db, { productId: p.product.id, phone: "054-123 4567", locale: "he" })).toEqual({ ok: true, already: false });
    expect(await signUpForRestock(db, { productId: p.product.id, phone: "+972541234567", locale: "he" })).toEqual({ ok: true, already: true });
  });

  it("a cancelled order that frees the last stock tells everyone waiting, exactly once", async () => {
    const f = await authorizedOrder(db, provider);
    // The order's 2.5 kg reservation is all that stood between the shop and "sold out".
    await db.update(stockItem).set({ onHandG: 2_600 }).where(eq(stockItem.productId, f.beef.product.id));
    await signUpForRestock(db, { productId: f.beef.product.id, phone: "052-111 2233", locale: "he" });
    await signUpForRestock(db, { productId: f.beef.product.id, phone: "053-444 5566", locale: "en" });
    expect(await notifyBackInStock(db, { productId: f.beef.product.id, appUrl: APP })).toBe(0);

    expect((await cancelByCustomer(db, provider, { orderNumber: f.order.orderNumber, token: f.order.accessToken, appUrl: APP })).ok).toBe(true);
    const messages = await sent("interest.restocked");
    expect(messages).toHaveLength(2);
    expect(messages.find((m) => m.locale === "en")!.renderedBody).toContain(`/en/p/${f.beef.product.slug}`);
    expect(await notifyBackInStock(db, { productId: f.beef.product.id, appUrl: APP })).toBe(0);
    expect(await sent("interest.restocked")).toHaveLength(2);
  });
});

describe("tell me when you deliver to my city", () => {
  it("refuses cities we serve, matches spelling variants, and notifies once when the city opens", async () => {
    await makeZone(db, { citiesHe: ["תל אביב"], citiesEn: ["Tel Aviv"] });
    expect(await signUpForArea(db, { city: "תל-אביב", phone: "054-123 4567", locale: "he" })).toEqual({ ok: false, problem: { key: "CITY_SERVED" } });
    expect(await signUpForArea(db, { city: "א", phone: "054-123 4567", locale: "he" })).toEqual({ ok: false, problem: { key: "CITY_INVALID" } });
    expect(await signUpForArea(db, { city: "פתח-תקווה", phone: "054-123 4567", locale: "he" })).toEqual({ ok: true, already: false });
    expect(await signUpForArea(db, { city: "פתח תקווה", phone: "054-123 4567", locale: "he" })).toEqual({ ok: true, already: true });

    expect(await notifyAreaOpened(db, { cities: ["פתח תקווה"], appUrl: APP })).toBe(1);
    expect(await notifyAreaOpened(db, { cities: ["פתח תקווה"], appUrl: APP })).toBe(0);
    const [msg] = await sent("interest.area_opened");
    expect(msg.renderedBody).toContain("פתח תקווה");
    expect((await db.select().from(interestSignup).where(and(eq(interestSignup.kind, "AREA"))))[0].notifiedAt).not.toBeNull();
  });
});
