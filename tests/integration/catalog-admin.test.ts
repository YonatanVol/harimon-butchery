import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { auditEvent, kashrutAuthority, product, productKashrut } from "@/infra/db/schema";
import { changePrice, loadCatalogAdmin, setPublished } from "@/infra/catalog/admin";
import { connectTestDb, makeStaff, makeWeightProduct, truncateAll } from "./support/db";

const { db, close } = connectTestDb();
beforeEach(() => truncateAll(db));
afterAll(() => close());

describe("catalog editing", () => {
  it("won't show a product without kashrut details or with an expired certificate", async () => {
    const p = await makeWeightProduct(db);
    const manager = await makeStaff(db, "MANAGER");
    await setPublished(db, { productId: p.product.id, published: false, staff: manager });

    const [pk] = await db.select().from(productKashrut).where(eq(productKashrut.productId, p.product.id));
    await db.update(kashrutAuthority).set({ certificateValidUntil: "2020-01-01" }).where(eq(kashrutAuthority.id, pk.authorityId));
    expect(await setPublished(db, { productId: p.product.id, published: true, staff: manager })).toEqual({ ok: false, problem: { key: "CERTIFICATE_EXPIRED", validUntil: "2020-01-01" } });

    await db.delete(productKashrut).where(eq(productKashrut.productId, p.product.id));
    expect(await setPublished(db, { productId: p.product.id, published: true, staff: manager })).toEqual({ ok: false, problem: { key: "NO_KASHRUT" } });
    const [row] = await loadCatalogAdmin(db);
    expect(row.flags).toEqual({ noKashrut: true, certificateExpired: false, noPhoto: true });
    // Hiding is always allowed.
    expect((await db.select().from(product).where(eq(product.id, p.product.id)))[0].published).toBe(false);
  });

  it("price changes need the permission, refuse a stale edit, and record old, new and the percentage", async () => {
    const p = await makeWeightProduct(db, { pricePerKgAgorot: 16_900 });
    const butcher = await makeStaff(db, "BUTCHER");
    const manager = await makeStaff(db, "MANAGER");
    expect(await changePrice(db, { productId: p.product.id, newAgorot: 18_900, expectedAgorot: 16_900, staff: butcher })).toEqual({ ok: false, problem: { key: "NOT_PERMITTED" } });
    expect(await changePrice(db, { productId: p.product.id, newAgorot: 50, expectedAgorot: 16_900, staff: manager })).toEqual({ ok: false, problem: { key: "INVALID_PRICE" } });
    expect(await changePrice(db, { productId: p.product.id, newAgorot: 18_900, expectedAgorot: 16_900, staff: manager })).toEqual({ ok: true, changeBp: 1183 });
    expect(await changePrice(db, { productId: p.product.id, newAgorot: 17_500, expectedAgorot: 16_900, staff: manager })).toEqual({ ok: false, problem: { key: "PRICE_CHANGED_MEANWHILE", current: 18_900 } });
    const [audit] = await db.select().from(auditEvent).where(eq(auditEvent.action, "product.price"));
    expect(audit).toMatchObject({ actorId: manager.id, before: { agorot: 16_900, unit: "kg" }, after: { agorot: 18_900, unit: "kg", changeBp: 1183 } });
  });
});
