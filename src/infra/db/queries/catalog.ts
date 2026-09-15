import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import { type Availability, availabilityOf } from "@/domain/catalog/availability";
import { db } from "../client";
import { category, kashrutAuthority, product, productKashrut, productVariant, stockItem } from "../schema";

export type ProductCard = Awaited<ReturnType<typeof listProducts>>[number];

const cardColumns = {
  id: product.id,
  slug: product.slug,
  categorySlug: category.slug,
  nameHe: product.nameHe,
  nameEn: product.nameEn,
  shortDescHe: product.shortDescHe,
  shortDescEn: product.shortDescEn,
  cutOriginHe: product.cutOriginHe,
  cutOriginEn: product.cutOriginEn,
  animal: product.animal,
  pricingMode: product.pricingMode,
  pricePerKgAgorot: product.pricePerKgAgorot,
  packagePriceAgorot: product.packagePriceAgorot,
  avgPieceG: product.avgPieceG,
  minOrderG: product.minOrderG,
  agingDays: product.agingDays,
  occasions: product.occasions,
  handlingFlags: product.handlingFlags,
  isBestSeller: product.isBestSeller,
  image: product.image,
  sortOrder: product.sortOrder,
  authoritySlug: kashrutAuthority.slug,
  authorityBadgeHe: kashrutAuthority.badgeHe,
  authorityBadgeEn: kashrutAuthority.badgeEn,
  glatt: productKashrut.glatt,
  passover: productKashrut.passover,
  onHandG: stockItem.onHandG,
  reservedG: stockItem.reservedG,
  onHandUnits: stockItem.onHandUnits,
  reservedUnits: stockItem.reservedUnits,
  lowThresholdG: stockItem.lowThresholdG,
  lowThresholdUnits: stockItem.lowThresholdUnits,
  nextRestockDate: stockItem.nextRestockDate,
};

type CardRow = { [K in keyof typeof cardColumns]: (typeof cardColumns)[K]["_"]["data"] | null };

function withAvailability<T extends CardRow>(row: T) {
  const availability: Availability = availabilityOf({
    pricingMode: row.pricingMode!,
    onHandG: row.onHandG ?? 0,
    reservedG: row.reservedG ?? 0,
    onHandUnits: row.onHandUnits ?? 0,
    reservedUnits: row.reservedUnits ?? 0,
    lowThresholdG: row.lowThresholdG ?? 0,
    lowThresholdUnits: row.lowThresholdUnits ?? 0,
    minOrderG: row.minOrderG,
    nextRestockDate: row.nextRestockDate,
  });
  return { ...row, availability };
}

function cardQuery() {
  return db
    .select(cardColumns)
    .from(product)
    .innerJoin(category, eq(category.id, product.categoryId))
    .innerJoin(productKashrut, eq(productKashrut.productId, product.id))
    .innerJoin(kashrutAuthority, eq(kashrutAuthority.id, productKashrut.authorityId))
    .leftJoin(stockItem, eq(stockItem.productId, product.id));
}

export async function listProducts() {
  const rows = await cardQuery().where(eq(product.published, true)).orderBy(asc(product.sortOrder));
  return rows.map(withAvailability);
}

export async function listCategories() {
  return db
    .select({
      id: category.id,
      slug: category.slug,
      nameHe: category.nameHe,
      nameEn: category.nameEn,
      descriptionHe: category.descriptionHe,
      descriptionEn: category.descriptionEn,
      image: category.image,
      productCount: sql<number>`count(${product.id})::int`,
    })
    .from(category)
    .leftJoin(product, and(eq(product.categoryId, category.id), eq(product.published, true)))
    .where(eq(category.published, true))
    .groupBy(category.id)
    .orderBy(asc(category.sortOrder));
}

export async function getCategory(slug: string) {
  const [cat] = await db
    .select()
    .from(category)
    .where(and(eq(category.slug, slug), eq(category.published, true)));
  if (!cat) return null;
  const rows = await cardQuery()
    .where(and(eq(product.categoryId, cat.id), eq(product.published, true)))
    .orderBy(asc(product.sortOrder));
  return { category: cat, products: rows.map(withAvailability) };
}

export async function getProduct(slug: string) {
  const [row] = await db
    .select({
      product,
      categorySlug: category.slug,
      categoryNameHe: category.nameHe,
      categoryNameEn: category.nameEn,
      kashrut: productKashrut,
      authority: kashrutAuthority,
      stock: stockItem,
    })
    .from(product)
    .innerJoin(category, eq(category.id, product.categoryId))
    .innerJoin(productKashrut, eq(productKashrut.productId, product.id))
    .innerJoin(kashrutAuthority, eq(kashrutAuthority.id, productKashrut.authorityId))
    .leftJoin(stockItem, eq(stockItem.productId, product.id))
    .where(and(eq(product.slug, slug), eq(product.published, true)));
  if (!row) return null;

  const variants = await db
    .select()
    .from(productVariant)
    .where(and(eq(productVariant.productId, row.product.id), eq(productVariant.published, true)))
    .orderBy(asc(productVariant.sortOrder));

  const availability = availabilityOf({
    pricingMode: row.product.pricingMode,
    onHandG: row.stock?.onHandG ?? 0,
    reservedG: row.stock?.reservedG ?? 0,
    onHandUnits: row.stock?.onHandUnits ?? 0,
    reservedUnits: row.stock?.reservedUnits ?? 0,
    lowThresholdG: row.stock?.lowThresholdG ?? 0,
    lowThresholdUnits: row.stock?.lowThresholdUnits ?? 0,
    minOrderG: row.product.minOrderG,
    nextRestockDate: row.stock?.nextRestockDate ?? null,
  });

  return { ...row, variants, availability };
}

export async function listAuthorities() {
  return db.select().from(kashrutAuthority).orderBy(asc(kashrutAuthority.sortOrder));
}

export async function listProductSlugs() {
  return db.select({ slug: product.slug }).from(product).where(eq(product.published, true));
}

/** Hebrew/English prefix search over names and short descriptions. */
export async function searchProducts(query: string) {
  const terms = query
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}\s'״׳-]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6);
  if (terms.length === 0) return [];
  const tsquery = terms.map((t) => `${t.replace(/['\\:&|!()]/g, "")}:*`).join(" & ");
  const rows = await cardQuery()
    .where(and(eq(product.published, true), sql`${product.searchVector} @@ to_tsquery('simple', ${tsquery})`))
    .orderBy(asc(product.sortOrder))
    .limit(40);
  return rows.map(withAvailability);
}
