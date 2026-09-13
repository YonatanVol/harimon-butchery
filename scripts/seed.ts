/**
 * Deterministic demo data: catalog, kashrut authorities, delivery zones, staff.
 * Wipes the business tables first. Usage: npm run db:seed
 */
import { existsSync } from "node:fs";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as s from "../src/infra/db/schema";
import { generateSlots } from "../src/infra/delivery/generateSlots";
import { authorities, categories, products, slotTemplates, staff, variantPresets, zones } from "./seed-data/catalog";

if (!process.env.DATABASE_URL && existsSync(".env.local")) process.loadEnvFile(".env.local");
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

const client = postgres(url, { max: 1, onnotice: () => {} });
const db = drizzle(client, { schema: s, casing: "snake_case" });

const today = new Date();
/** Only reference photos that actually exist, so the storefront never shows a broken image. */
const publicImage = (path: string) => (existsSync(`public${path}`) ? path : null);

const isoDate = (daysFromToday: number) => {
  const d = new Date(today);
  d.setUTCDate(d.getUTCDate() + daysFromToday);
  return d.toISOString().slice(0, 10);
};

async function main() {
  const started = Date.now();

  await db.execute(sql`TRUNCATE
    notification, notification_suppression, payment_webhook_event, payment_refund, payment_capture,
    payment_intent, invoice, invoice_counter, order_status_event, order_line, orders, cart_line, cart,
    slot_hold, delivery_slot, delivery_slot_template, calendar_blackout, address, customer,
    stock_movement, stock_item, product_variant, product_kashrut, product, category,
    kashrut_authority, delivery_zone, staff_user, audit_event, setting, idempotency_key, order_counter, mock_psp_transaction
    RESTART IDENTITY CASCADE`);

  await db.transaction(async (tx) => {
    const cats = await tx
      .insert(s.category)
      .values(categories.map((c, i) => ({ ...c, sortOrder: i, image: publicImage(`/catalog/categories/${c.slug}.jpg`) })))
      .returning({ id: s.category.id, slug: s.category.slug });
    const categoryId = Object.fromEntries(cats.map((c) => [c.slug, c.id]));

    const auths = await tx
      .insert(s.kashrutAuthority)
      .values(
        authorities.map((a, i) => ({
          slug: a.slug,
          nameHe: a.nameHe,
          nameEn: a.nameEn,
          badgeHe: a.badgeHe,
          badgeEn: a.badgeEn,
          certificateNumber: a.certificateNumber,
          certificateValidUntil: isoDate(a.validForDays),
          isFictional: true,
          sortOrder: i,
        })),
      )
      .returning({ id: s.kashrutAuthority.id, slug: s.kashrutAuthority.slug });
    const authorityId = Object.fromEntries(auths.map((a) => [a.slug, a.id]));

    for (const [i, p] of products.entries()) {
      const [row] = await tx
        .insert(s.product)
        .values({
          slug: p.slug,
          categoryId: categoryId[p.category],
          nameHe: p.nameHe,
          nameEn: p.nameEn,
          shortDescHe: p.shortHe,
          shortDescEn: p.shortEn,
          longDescHe: p.longHe,
          longDescEn: p.longEn,
          cookingHe: p.cookingHe,
          cookingEn: p.cookingEn,
          animal: p.animal,
          cutOriginHe: p.originHe ?? null,
          cutOriginEn: p.originEn ?? null,
          pricingMode: p.weight ? "WEIGHT" : "PACKAGE",
          pricePerKgAgorot: p.weight ? p.weight.pricePerKg * 100 : null,
          minOrderG: p.weight?.min ?? null,
          maxOrderG: p.weight?.max ?? null,
          stepG: p.weight?.step ?? null,
          defaultOrderG: p.weight?.def ?? null,
          toleranceBp: p.weight?.tolerance ?? 1000,
          avgPieceG: p.weight?.avgPiece ?? null,
          packagePriceAgorot: p.pkg ? p.pkg.price * 100 : null,
          packageContentsHe: p.pkg?.contentsHe ?? null,
          packageContentsEn: p.pkg?.contentsEn ?? null,
          packageNominalG: p.pkg?.nominalG ?? null,
          agingDays: p.agingDays ?? null,
          handlingFlags: p.flags ?? [],
          occasions: p.occasions,
          isBestSeller: p.bestSeller ?? false,
          image: publicImage(`/catalog/products/${p.slug}.jpg`),
          imageAltHe: p.nameHe,
          imageAltEn: p.nameEn,
          sortOrder: i,
        })
        .returning({ id: s.product.id });

      await tx.insert(s.productKashrut).values({
        productId: row.id,
        authorityId: authorityId[p.kashrut.authority],
        shechita: p.kashrut.shechita,
        glatt: p.kashrut.glatt,
        nikur: p.kashrut.nikur,
        salted: p.kashrut.salted,
        passover: p.kashrut.passover,
      });

      await tx.insert(s.productVariant).values(
        variantPresets[p.variants].map((v, vi) => ({
          productId: row.id,
          sku: `${p.slug}-${v.key}`,
          nameHe: v.nameHe,
          nameEn: v.nameEn,
          priceDeltaAgorot: v.deltaAgorot ?? 0,
          cutInstructionHe: v.cutHe ?? null,
          cutInstructionEn: v.cutEn ?? null,
          isDefault: vi === 0,
          sortOrder: vi,
        })),
      );

      const level = p.stock ?? "in";
      const isWeight = Boolean(p.weight);
      const onHandG = !isWeight ? 0 : level === "in" ? 40_000 : level === "low" ? 2_000 : 0;
      const onHandUnits = isWeight ? 0 : level === "in" ? 30 : level === "low" ? 2 : 0;
      await tx.insert(s.stockItem).values({
        productId: row.id,
        onHandG,
        onHandUnits,
        lowThresholdG: isWeight ? 3_000 : 0,
        lowThresholdUnits: isWeight ? 0 : 4,
        nextRestockDate: level === "out" ? isoDate(3) : null,
      });
      await tx.insert(s.stockMovement).values({
        productId: row.id,
        deltaG: onHandG,
        deltaUnits: onHandUnits,
        reason: "RECEIVED",
        note: "Seed",
      });
    }

    const zoneRows = await tx.insert(s.deliveryZone).values(
      zones.map((z, i) => ({
        slug: z.slug,
        nameHe: z.nameHe,
        nameEn: z.nameEn,
        citiesHe: z.citiesHe,
        citiesEn: z.citiesEn,
        deliveryFeeAgorot: z.fee * 100,
        freeDeliveryOverAgorot: z.freeOver === null ? null : z.freeOver * 100,
        minOrderAgorot: z.minOrder * 100,
        leadTimeMinutes: z.leadHours * 60,
        active: z.active ?? true,
        sortOrder: i,
      })),
    ).returning({ id: s.deliveryZone.id, slug: s.deliveryZone.slug });

    for (const zone of zoneRows) {
      const templates = slotTemplates[zone.slug] ?? [];
      if (templates.length === 0) continue;
      await tx.insert(s.deliverySlotTemplate).values(
        templates.map((t) => ({
          zoneId: zone.id,
          weekday: t.weekday,
          startTime: t.start,
          endTime: t.end,
          capacityOrders: t.capacity,
          capacityWeightG: t.capacity * 15_000,
          cutoffLeadMinutes: t.cutoffHours * 60,
        })),
      );
    }

    await tx.insert(s.staffUser).values(
      staff.map((m) => ({ phoneE164: m.phone, fullNameHe: m.nameHe, fullNameEn: m.nameEn, role: m.role })),
    );

    await tx.insert(s.setting).values([
      { key: "shop.location", value: { city: "Tel Aviv", latitude: 32.0853, longitude: 34.7818, tzid: "Asia/Jerusalem" } },
      { key: "delivery.erevShabbatBufferMinutes", value: 180 },
      { key: "weighing.defaultToleranceBp", value: 1000 },
      { key: "weighing.overTolerancePolicy", value: "TRIM_TO_CEILING" },
      { key: "tax.vatRateBp", value: 1800 },
      { key: "payments.provider", value: "MOCK" },
      { key: "notifications.provider", value: "MOCK" },
      { key: "delivery.coldChainMaxHours", value: 6 },
    ]);
  });

  const slots = await generateSlots(db, { days: 84 });
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(s.product);
  console.log(`✓ Seeded ${count} products, ${categories.length} categories, ${zones.length} zones, ${slots.planned} delivery windows (${slots.open} open) in ${Date.now() - started} ms`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => client.end());
