import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { auditEvent, notification, stockItem, stockMovement } from "@/infra/db/schema";
import { signUpForRestock } from "@/infra/interest/signups";
import { changeStock, loadStockView, setRestockDate } from "@/infra/stock/stock";
import { connectTestDb, makeStaff, makeWeightProduct, truncateAll } from "./support/db";

const { db, close } = connectTestDb();
beforeEach(() => truncateAll(db));
afterAll(() => close());
const APP = "http://test.local";

describe("stock", () => {
  it("receiving goods adds stock, records who and why, and tells people waiting — once it is orderable", async () => {
    const p = await makeWeightProduct(db, { onHandG: 0 });
    const butcher = await makeStaff(db, "BUTCHER");
    await signUpForRestock(db, { productId: p.product.id, phone: "054-123 4567", locale: "he" });

    expect(await changeStock(db, { productId: p.product.id, change: { kind: "RECEIVED", amount: 100 }, note: "", staff: butcher, appUrl: APP })).toEqual({ ok: true, onHand: 100, notified: 0 });
    expect(await changeStock(db, { productId: p.product.id, change: { kind: "RECEIVED", amount: 12_000 }, note: "משלוח בוקר", staff: butcher, appUrl: APP })).toEqual({ ok: true, onHand: 12_100, notified: 1 });

    const moves = await db.select().from(stockMovement).where(eq(stockMovement.productId, p.product.id));
    expect(moves.map((m) => [m.reason, m.deltaG, m.staffId])).toEqual([
      ["RECEIVED", 100, butcher.id],
      ["RECEIVED", 12_000, butcher.id],
    ]);
    expect(await db.select().from(auditEvent)).toHaveLength(2);
    expect(await db.select().from(notification)).toHaveLength(1);
  });

  it("spoilage and counts need a note, and can't go below what open orders hold", async () => {
    const p = await makeWeightProduct(db, { onHandG: 10_000 });
    await db.update(stockItem).set({ reservedG: 4_000 }).where(eq(stockItem.productId, p.product.id));
    const manager = await makeStaff(db, "MANAGER");
    const base = { productId: p.product.id, staff: manager, appUrl: APP };

    expect(await changeStock(db, { ...base, change: { kind: "SPOILAGE", amount: 1_000 }, note: "" })).toEqual({ ok: false, problem: { key: "NOTE_REQUIRED" } });
    expect(await changeStock(db, { ...base, change: { kind: "SPOILAGE", amount: 7_000 }, note: "קירור נפל" })).toEqual({ ok: false, problem: { key: "BELOW_RESERVED", reserved: 4_000 } });
    expect(await changeStock(db, { ...base, change: { kind: "SPOILAGE", amount: 1_500 }, note: "קירור נפל" })).toMatchObject({ ok: true, onHand: 8_500 });
    expect(await changeStock(db, { ...base, change: { kind: "COUNT_CORRECTION", amount: 8_200 }, note: "ספירת ערב" })).toMatchObject({ ok: true, onHand: 8_200 });
    const [last] = (await db.select().from(stockMovement).where(eq(stockMovement.productId, p.product.id))).slice(-1);
    expect(last).toMatchObject({ reason: "COUNT_CORRECTION", deltaG: -300 });
    expect(await changeStock(db, { ...base, change: { kind: "RECEIVED", amount: 1.5 }, note: "" })).toEqual({ ok: false, problem: { key: "INVALID_AMOUNT" } });
    expect(await changeStock(db, { ...base, change: { kind: "RECEIVED", amount: 4_500_450 }, note: "" })).toEqual({ ok: false, problem: { key: "TOO_LARGE", max: 500_000 } });
  });

  it("only roles that manage stock can change it", async () => {
    const p = await makeWeightProduct(db);
    const packer = await makeStaff(db, "PACKER");
    expect(await changeStock(db, { productId: p.product.id, change: { kind: "RECEIVED", amount: 1_000 }, note: "", staff: packer, appUrl: APP })).toEqual({ ok: false, problem: { key: "NOT_PERMITTED" } });
    expect(await setRestockDate(db, { productId: p.product.id, date: "2026-09-20", staff: packer })).toEqual({ ok: false, problem: { key: "NOT_PERMITTED" } });
  });

  it("the stock screen lists sold-out and low items first", async () => {
    await makeWeightProduct(db, { onHandG: 40_000, slug: "plenty" });
    await makeWeightProduct(db, { onHandG: 2_000, slug: "low" });
    await makeWeightProduct(db, { onHandG: 0, slug: "out" });
    expect((await loadStockView(db)).map((r) => [r.slug, r.state])).toEqual([
      ["out", "OUT"],
      ["low", "LOW"],
      ["plenty", "IN_STOCK"],
    ]);
  });
});
