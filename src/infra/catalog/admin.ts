import { asc, eq, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { can, type StaffRole } from "@/domain/auth/permissions";
import { israelDateOf, toIsoDate } from "@/domain/delivery/israelTime";
import { agorot } from "@/domain/money/agorot";
import { percentChangeBp } from "@/domain/money/change";
import type * as schema from "../db/schema";
import { auditEvent, category, kashrutAuthority, product, productKashrut } from "../db/schema";

type Database = PostgresJsDatabase<typeof schema>;
type Staff = { id: string; role: string };

export type CatalogProblem =
  | { key: "NOT_PERMITTED" }
  | { key: "NOT_FOUND" }
  | { key: "NO_KASHRUT" }
  | { key: "CERTIFICATE_EXPIRED"; validUntil: string }
  | { key: "INVALID_PRICE" }
  | { key: "PRICE_CHANGED_MEANWHILE"; current: number };

/** Every product with what the storefront needs from it, and what's missing. */
export async function loadCatalogAdmin(db: Database, now = new Date()) {
  const today = toIsoDate(israelDateOf(now));
  const rows = await db
    .select({
      id: product.id,
      slug: product.slug,
      nameHe: product.nameHe,
      nameEn: product.nameEn,
      categoryHe: category.nameHe,
      categoryEn: category.nameEn,
      pricingMode: product.pricingMode,
      pricePerKgAgorot: product.pricePerKgAgorot,
      packagePriceAgorot: product.packagePriceAgorot,
      published: product.published,
      image: product.image,
      authorityHe: kashrutAuthority.nameHe,
      authorityEn: kashrutAuthority.nameEn,
      validUntil: kashrutAuthority.certificateValidUntil,
      hasKashrut: sql<boolean>`${productKashrut.productId} is not null`,
    })
    .from(product)
    .innerJoin(category, eq(category.id, product.categoryId))
    .leftJoin(productKashrut, eq(productKashrut.productId, product.id))
    .leftJoin(kashrutAuthority, eq(kashrutAuthority.id, productKashrut.authorityId))
    .orderBy(asc(category.sortOrder), sql`${product.nameHe} collate "he-IL-x-icu"`);

  return rows.map((r) => ({
    ...r,
    price: (r.pricingMode === "WEIGHT" ? r.pricePerKgAgorot : r.packagePriceAgorot) ?? 0,
    flags: {
      noKashrut: !r.hasKashrut,
      certificateExpired: Boolean(r.validUntil && r.validUntil < today),
      noPhoto: !r.image,
    },
  }));
}

/**
 * Show or hide a product. A product can't be shown without kashrut details under a valid certificate —
 * on a kosher shop that is the one thing that must never be missing. A missing photo is flagged, not blocked:
 * the storefront has a designed placeholder.
 */
export async function setPublished(db: Database, input: { productId: string; published: boolean; staff: Staff; now?: Date }): Promise<{ ok: true } | { ok: false; problem: CatalogProblem }> {
  if (!can(input.staff.role as StaffRole, "EDIT_CATALOG")) return { ok: false, problem: { key: "NOT_PERMITTED" } };
  const today = toIsoDate(israelDateOf(input.now ?? new Date()));
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({ product, validUntil: kashrutAuthority.certificateValidUntil, kashrut: productKashrut.productId })
      .from(product)
      .leftJoin(productKashrut, eq(productKashrut.productId, product.id))
      .leftJoin(kashrutAuthority, eq(kashrutAuthority.id, productKashrut.authorityId))
      .where(eq(product.id, input.productId))
      .for("update", { of: [product] });
    if (!row) return { ok: false as const, problem: { key: "NOT_FOUND" } as CatalogProblem };
    if (input.published && !row.kashrut) return { ok: false as const, problem: { key: "NO_KASHRUT" } as CatalogProblem };
    if (input.published && row.validUntil && row.validUntil < today) return { ok: false as const, problem: { key: "CERTIFICATE_EXPIRED", validUntil: row.validUntil } as CatalogProblem };
    if (row.product.published === input.published) return { ok: true as const };
    await tx.update(product).set({ published: input.published }).where(eq(product.id, input.productId));
    await tx.insert(auditEvent).values({
      actorType: "STAFF",
      actorId: input.staff.id,
      entityType: "product",
      entityId: input.productId,
      action: input.published ? "product.publish" : "product.unpublish",
      before: { published: row.product.published },
      after: { published: input.published },
    });
    return { ok: true as const };
  });
}

/**
 * Change a product's price (per kg, or per package). `expectedAgorot` is the price the editor saw: if someone
 * changed it in the meantime, nothing is written and the current price comes back. Orders already placed keep
 * the price they were placed at.
 */
export async function changePrice(
  db: Database,
  input: { productId: string; newAgorot: number; expectedAgorot: number; staff: Staff },
): Promise<{ ok: true; changeBp: number } | { ok: false; problem: CatalogProblem }> {
  if (!can(input.staff.role as StaffRole, "EDIT_PRICES")) return { ok: false, problem: { key: "NOT_PERMITTED" } };
  if (!Number.isSafeInteger(input.newAgorot) || input.newAgorot < 100 || input.newAgorot > 1_000_000) return { ok: false, problem: { key: "INVALID_PRICE" } };
  return db.transaction(async (tx) => {
    const [p] = await tx.select().from(product).where(eq(product.id, input.productId)).for("update");
    if (!p) return { ok: false as const, problem: { key: "NOT_FOUND" } as CatalogProblem };
    const weight = p.pricingMode === "WEIGHT";
    const current = (weight ? p.pricePerKgAgorot : p.packagePriceAgorot) ?? 0;
    if (current !== input.expectedAgorot) return { ok: false as const, problem: { key: "PRICE_CHANGED_MEANWHILE", current } as CatalogProblem };
    const changeBp = percentChangeBp(agorot(current), agorot(input.newAgorot));
    if (current === input.newAgorot) return { ok: true as const, changeBp: 0 };
    await tx
      .update(product)
      .set(weight ? { pricePerKgAgorot: input.newAgorot } : { packagePriceAgorot: input.newAgorot })
      .where(eq(product.id, p.id));
    await tx.insert(auditEvent).values({
      actorType: "STAFF",
      actorId: input.staff.id,
      entityType: "product",
      entityId: p.id,
      action: "product.price",
      before: { agorot: current, unit: weight ? "kg" : "package" },
      after: { agorot: input.newAgorot, unit: weight ? "kg" : "package", changeBp },
    });
    return { ok: true as const, changeBp };
  });
}
