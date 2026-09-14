import { asc, desc, eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { can, type StaffRole } from "@/domain/auth/permissions";
import { availabilityOf } from "@/domain/catalog/availability";
import { MAX_STOCK_CHANGE_G, MAX_STOCK_CHANGE_UNITS } from "@/domain/catalog/stockLimits";
import type * as schema from "../db/schema";
import { auditEvent, category, product, staffUser, stockItem, stockMovement } from "../db/schema";
import { notifyBackInStock } from "../interest/signups";

type Database = NodePgDatabase<typeof schema>;
type Staff = { id: string; role: string };

export type StockChange =
  /** Goods arrived: add to what's on hand. */
  | { kind: "RECEIVED"; amount: number }
  /** Thrown away: take off what's on hand. */
  | { kind: "SPOILAGE"; amount: number }
  /** Counted the cold room: on hand becomes exactly this. */
  | { kind: "COUNT_CORRECTION"; amount: number };

export type StockProblem =
  | { key: "NOT_PERMITTED" }
  | { key: "NOT_FOUND" }
  | { key: "INVALID_AMOUNT" }
  | { key: "TOO_LARGE"; max: number }
  | { key: "NOTE_REQUIRED" }
  | { key: "BELOW_RESERVED"; reserved: number }
  | { key: "INVALID_DATE" };

export type StockResult = { ok: true; onHand: number; notified: number } | { ok: false; problem: StockProblem };

/** Every product with what's on hand, promised to open orders, and free — rows that need restocking first. */
export async function loadStockView(db: Database) {
  const rows = await db
    .select({
      productId: product.id,
      slug: product.slug,
      nameHe: product.nameHe,
      nameEn: product.nameEn,
      categoryHe: category.nameHe,
      categoryEn: category.nameEn,
      pricingMode: product.pricingMode,
      minOrderG: product.minOrderG,
      published: product.published,
      stock: stockItem,
      waiting: sql<number>`(select count(*)::int from interest_signup i where i.kind = 'RESTOCK' and i.subject = product.id::text and i.notified_at is null)`,
    })
    .from(product)
    .innerJoin(stockItem, eq(stockItem.productId, product.id))
    .innerJoin(category, eq(category.id, product.categoryId))
    .orderBy(asc(category.sortOrder), sql`${product.nameHe} collate "he-IL-x-icu"`);

  const last = await db
    .selectDistinctOn([stockMovement.productId], {
      productId: stockMovement.productId,
      reason: stockMovement.reason,
      deltaG: stockMovement.deltaG,
      deltaUnits: stockMovement.deltaUnits,
      createdAt: stockMovement.createdAt,
      staffHe: staffUser.fullNameHe,
      staffEn: staffUser.fullNameEn,
    })
    .from(stockMovement)
    .leftJoin(staffUser, eq(staffUser.id, stockMovement.staffId))
    .orderBy(stockMovement.productId, desc(stockMovement.createdAt));
  const lastBy = new Map(last.map((m) => [m.productId, m]));

  const view = rows.map((r) => {
    const weight = r.pricingMode === "WEIGHT";
    const availability = availabilityOf({ ...r.stock, pricingMode: r.pricingMode, minOrderG: r.minOrderG });
    return {
      ...r,
      weight,
      onHand: weight ? r.stock.onHandG : r.stock.onHandUnits,
      reserved: weight ? r.stock.reservedG : r.stock.reservedUnits,
      available: Math.max(0, weight ? r.stock.onHandG - r.stock.reservedG : r.stock.onHandUnits - r.stock.reservedUnits),
      threshold: weight ? r.stock.lowThresholdG : r.stock.lowThresholdUnits,
      state: availability.kind,
      lastMovement: lastBy.get(r.productId) ?? null,
    };
  });
  const rank = { OUT: 0, LOW: 1, IN_STOCK: 2 } as const;
  // Stable: within the same urgency, the catalog order above is kept.
  return view.map((v, i) => ({ v, i })).sort((a, b) => rank[a.v.state] - rank[b.v.state] || a.i - b.i).map(({ v }) => v);
}

/**
 * One stock change, recorded as a movement and in the audit log. Amounts are grams for weight products and
 * units for packages. Stock can't drop below what open orders already hold.
 */
export async function changeStock(
  db: Database,
  input: { productId: string; change: StockChange; note: string; staff: Staff; appUrl: string; now?: Date },
): Promise<StockResult> {
  if (!can(input.staff.role as StaffRole, "MANAGE_STOCK")) return { ok: false, problem: { key: "NOT_PERMITTED" } };
  const { change } = input;
  const note = input.note.trim().slice(0, 200);
  if (!Number.isSafeInteger(change.amount) || change.amount < 0 || change.amount > 5_000_000 || (change.kind !== "COUNT_CORRECTION" && change.amount === 0)) {
    return { ok: false, problem: { key: "INVALID_AMOUNT" } };
  }
  // Throwing meat away or overriding a count needs a word about why; receiving goods doesn't.
  if (change.kind !== "RECEIVED" && note.length < 3) return { ok: false, problem: { key: "NOTE_REQUIRED" } };

  return db.transaction(async (tx): Promise<StockResult> => {
    const [row] = await tx.select({ stock: stockItem, product }).from(stockItem).innerJoin(product, eq(product.id, stockItem.productId)).where(eq(stockItem.productId, input.productId)).for("update", { of: [stockItem] });
    if (!row) return { ok: false, problem: { key: "NOT_FOUND" } };
    const weight = row.product.pricingMode === "WEIGHT";
    const max = weight ? MAX_STOCK_CHANGE_G : MAX_STOCK_CHANGE_UNITS;
    if (change.amount > max) return { ok: false, problem: { key: "TOO_LARGE", max } };
    const onHand = weight ? row.stock.onHandG : row.stock.onHandUnits;
    const reserved = weight ? row.stock.reservedG : row.stock.reservedUnits;
    const next = change.kind === "RECEIVED" ? onHand + change.amount : change.kind === "SPOILAGE" ? onHand - change.amount : change.amount;
    if (next < reserved) return { ok: false, problem: { key: "BELOW_RESERVED", reserved } };
    const delta = next - onHand;

    await tx.update(stockItem).set(weight ? { onHandG: next } : { onHandUnits: next }).where(eq(stockItem.productId, input.productId));
    await tx.insert(stockMovement).values({
      productId: input.productId,
      deltaG: weight ? delta : 0,
      deltaUnits: weight ? 0 : delta,
      reason: change.kind,
      staffId: input.staff.id,
      note: note || null,
      createdAt: input.now,
    });
    await tx.insert(auditEvent).values({
      actorType: "STAFF",
      actorId: input.staff.id,
      entityType: "product",
      entityId: input.productId,
      action: `stock.${change.kind.toLowerCase()}`,
      before: { onHand, unit: weight ? "g" : "units" },
      after: { onHand: next, unit: weight ? "g" : "units" },
      reason: note || null,
    });
    const notified = delta > 0 ? await notifyBackInStock(tx, { productId: input.productId, appUrl: input.appUrl, now: input.now }) : 0;
    return { ok: true, onHand: next, notified };
  });
}

/** When the next delivery of a sold-out product is expected — shown to customers as "back on Tuesday". */
export async function setRestockDate(db: Database, input: { productId: string; date: string | null; staff: Staff }): Promise<{ ok: true } | { ok: false; problem: StockProblem }> {
  if (!can(input.staff.role as StaffRole, "MANAGE_STOCK")) return { ok: false, problem: { key: "NOT_PERMITTED" } };
  if (input.date !== null && !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return { ok: false, problem: { key: "INVALID_DATE" } };
  const r = await db.update(stockItem).set({ nextRestockDate: input.date }).where(eq(stockItem.productId, input.productId)).returning({ id: stockItem.productId });
  if (!r.length) return { ok: false, problem: { key: "NOT_FOUND" } };
  await db.insert(auditEvent).values({ actorType: "STAFF", actorId: input.staff.id, entityType: "product", entityId: input.productId, action: "stock.restock_date", after: { date: input.date } });
  return { ok: true };
}
