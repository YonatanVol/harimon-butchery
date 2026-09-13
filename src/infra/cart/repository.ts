import "server-only";
import { and, asc, eq, gt, gte, isNull, lt, sql } from "drizzle-orm";
import { availabilityOf } from "@/domain/catalog/availability";
import { quoteCart } from "@/domain/cart/cart";
import { addDays, israelDateOf, toIsoDate } from "@/domain/delivery/israelTime";
import { dayContext } from "@/domain/delivery/jewishCalendar";
import { closedDayReason, slotAvailability } from "@/domain/delivery/slots";
import { agorot } from "@/domain/money/agorot";
import type { PricedLine } from "@/domain/order/totals";
import { grams } from "@/domain/weight/grams";
import { db } from "../db/client";
import { cart, cartLine, deliverySlot, deliveryZone, product, productVariant, setting, slotHold, stockItem } from "../db/schema";

export async function findOpenCart(token: string) {
  const [row] = await db
    .select()
    .from(cart)
    .where(and(eq(cart.anonymousToken, token), eq(cart.status, "OPEN")));
  return row ?? null;
}

export async function getOrCreateCart(token: string, locale: string) {
  const existing = await findOpenCart(token);
  if (existing) return existing;
  const [created] = await db
    .insert(cart)
    .values({ anonymousToken: token, locale: locale === "en" ? "en" : "he" })
    .onConflictDoNothing()
    .returning();
  return created ?? (await findOpenCart(token))!;
}

export async function loadCartLines(cartId: string) {
  const rows = await db
    .select({
      line: cartLine,
      variant: {
        id: productVariant.id,
        nameHe: productVariant.nameHe,
        nameEn: productVariant.nameEn,
        priceDeltaAgorot: productVariant.priceDeltaAgorot,
        published: productVariant.published,
      },
      product: {
        id: product.id,
        slug: product.slug,
        nameHe: product.nameHe,
        nameEn: product.nameEn,
        animal: product.animal,
        image: product.image,
        pricingMode: product.pricingMode,
        pricePerKgAgorot: product.pricePerKgAgorot,
        packagePriceAgorot: product.packagePriceAgorot,
        minOrderG: product.minOrderG,
        maxOrderG: product.maxOrderG,
        stepG: product.stepG,
        toleranceBp: product.toleranceBp,
        published: product.published,
      },
      stock: stockItem,
      variantCount: sql<number>`(select count(*)::int from product_variant pv where pv.product_id = product.id and pv.published)`,
    })
    .from(cartLine)
    .innerJoin(productVariant, eq(productVariant.id, cartLine.variantId))
    .innerJoin(product, eq(product.id, productVariant.productId))
    .leftJoin(stockItem, eq(stockItem.productId, product.id))
    .where(eq(cartLine.cartId, cartId))
    .orderBy(asc(cartLine.addedAt));

  return rows.map(({ line, variant, product: p, stock, variantCount }) => {
    const availability = availabilityOf({
      pricingMode: p.pricingMode,
      onHandG: stock?.onHandG ?? 0,
      reservedG: stock?.reservedG ?? 0,
      onHandUnits: stock?.onHandUnits ?? 0,
      reservedUnits: stock?.reservedUnits ?? 0,
      lowThresholdG: stock?.lowThresholdG ?? 0,
      lowThresholdUnits: stock?.lowThresholdUnits ?? 0,
      minOrderG: p.minOrderG,
      nextRestockDate: stock?.nextRestockDate ?? null,
    });
    const unavailable = !p.published || !variant.published || availability.kind === "OUT";
    const priced: PricedLine =
      p.pricingMode === "WEIGHT"
        ? {
            mode: "WEIGHT",
            pricePerKg: agorot(p.pricePerKgAgorot! + variant.priceDeltaAgorot),
            requested: grams(line.requestedG!),
            toleranceBp: p.toleranceBp,
          }
        : { mode: "PACKAGE", unitPrice: agorot(p.packagePriceAgorot! + variant.priceDeltaAgorot), quantity: line.quantity! };
    return { line, variant, product: p, availability, unavailable, priced, variantCount };
  });
}

export type CartLineView = Awaited<ReturnType<typeof loadCartLines>>[number];

export async function loadZones() {
  return db.select().from(deliveryZone).orderBy(asc(deliveryZone.sortOrder));
}

export async function activeHoldForCart(cartId: string, now = new Date()) {
  const [hold] = await db
    .select({ hold: slotHold, slot: deliverySlot })
    .from(slotHold)
    .innerJoin(deliverySlot, eq(deliverySlot.id, slotHold.slotId))
    .where(and(eq(slotHold.cartId, cartId), isNull(slotHold.releasedAt), gt(slotHold.expiresAt, now)))
    .limit(1);
  return hold ?? null;
}

export async function loadCartView(token: string | null, now = new Date()) {
  const current = token ? await findOpenCart(token) : null;
  if (!current) return null;
  const [lines, zones, hold] = await Promise.all([
    loadCartLines(current.id),
    loadZones(),
    activeHoldForCart(current.id, now),
  ]);
  const zone = zones.find((z) => z.id === current.zoneId) ?? null;
  const quote = quoteCart(
    lines.filter((l) => !l.unavailable).map((l) => l.priced),
    zone ? { deliveryFeeAgorot: zone.deliveryFeeAgorot, freeDeliveryOverAgorot: zone.freeDeliveryOverAgorot, minOrderAgorot: zone.minOrderAgorot } : null,
  );
  return { cart: current, lines, zone, zones, hold, quote };
}

export type CartView = NonNullable<Awaited<ReturnType<typeof loadCartView>>>;

export async function cartSummary(token: string | null) {
  const current = token ? await findOpenCart(token) : null;
  if (!current) return { count: 0 };
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(cartLine)
    .where(eq(cartLine.cartId, current.id));
  return { count };
}

async function shopLocation() {
  const [row] = await db.select().from(setting).where(eq(setting.key, "shop.location"));
  const v = (row?.value ?? { latitude: 32.0853, longitude: 34.7818 }) as { latitude: number; longitude: number };
  return { latitude: v.latitude, longitude: v.longitude };
}

/** The next `days` days of delivery windows for a zone, each with what the customer can do and why. */
export async function loadSlotDays(zoneId: string, cartId: string | null, now = new Date(), days = 14) {
  const [zone] = await db.select().from(deliveryZone).where(eq(deliveryZone.id, zoneId));
  if (!zone) return [];
  const today = israelDateOf(now);
  const until = addDays(today, days);
  const shop = await shopLocation();

  const slots = await db
    .select({
      slot: deliverySlot,
      // Written with explicit aliases: in a single-table select Drizzle renders bare column names, which inside
      // a subquery silently bind to the inner table ("id" = slot_hold.id) and count nothing.
      holds: sql<number>`(
        select count(*)::int from slot_hold h
        where h.slot_id = delivery_slot.id
          and h.released_at is null
          and h.expires_at > ${now.toISOString()}::timestamptz
          ${cartId ? sql`and h.cart_id <> ${cartId}` : sql``}
      )`,
    })
    .from(deliverySlot)
    .where(
      and(
        eq(deliverySlot.zoneId, zoneId),
        gte(deliverySlot.serviceDate, toIsoDate(today)),
        lt(deliverySlot.serviceDate, toIsoDate(until)),
      ),
    )
    .orderBy(asc(deliverySlot.startsAt));

  return Array.from({ length: days }, (_, i) => {
    const date = addDays(today, i);
    const iso = toIsoDate(date);
    const ctx = dayContext(date, shop);
    const daySlots = slots
      .filter((s) => s.slot.serviceDate === iso)
      .map(({ slot, holds }) => ({
        id: slot.id,
        startsAt: slot.startsAt.toISOString(),
        endsAt: slot.endsAt.toISOString(),
        cutoffAt: slot.cutoffAt.toISOString(),
        availability: slotAvailability(
          {
            status: slot.status,
            startsAt: slot.startsAt,
            cutoffAt: slot.cutoffAt,
            capacityOrders: slot.capacityOrders,
            reservedOrders: slot.reservedOrders,
            activeHolds: holds,
            reasonHe: slot.blackoutReasonHe,
            reasonEn: slot.blackoutReasonEn,
          },
          now,
          zone.leadTimeMinutes,
        ),
      }));
    const closed = closedDayReason(ctx);
    return {
      date: iso,
      weekday: ctx.weekday,
      hebrewDateHe: ctx.hebrewDateHe,
      closedReason: closed ? { he: closed.he, en: closed.en } : null,
      slots: daySlots,
    };
  });
}

export type SlotDay = Awaited<ReturnType<typeof loadSlotDays>>[number];
