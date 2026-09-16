import { randomBytes } from "node:crypto";
import { and, asc, eq, gt, isNull, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { availabilityOf } from "@/domain/catalog/availability";
import { type LineProblem, quoteCart, validateQuantity, validateWeight } from "@/domain/cart/cart";
import { type CheckoutDetails, type DetailsErrors, validateDetails } from "@/domain/checkout/details";
import { slotAvailability } from "@/domain/delivery/slots";
import { agorot } from "@/domain/money/agorot";
import { ISRAEL_VAT_BP } from "@/domain/money/vat";
import { lineCeiling, lineEstimate, type PricedLine } from "@/domain/order/totals";
import type { PaymentProvider } from "@/domain/payments/provider";
import { grams } from "@/domain/weight/grams";
import { toleranceBounds } from "@/domain/weight/tolerance";
import type * as schema from "../db/schema";
import {
  address,
  cart,
  cartLine,
  customer,
  deliverySlot,
  deliveryZone,
  order,
  orderCounter,
  orderLine,
  orderStatusEvent,
  paymentIntent,
  product,
  productVariant,
  slotHold,
  stockItem,
} from "../db/schema";
import { expireIfAbandoned } from "./authorization";
import { applyOrderEvent } from "./events";

type Database = NodePgDatabase<typeof schema>;

export type PlaceOrderProblem =
  | { key: "DETAILS_INVALID"; errors: DetailsErrors }
  | { key: "CART_NOT_FOUND" }
  | { key: "CART_EMPTY" }
  | { key: "LINE_CHANGED"; productNameHe: string; productNameEn: string; problem: LineProblem }
  | { key: "NO_ZONE" }
  | { key: "BELOW_MINIMUM"; gapAgorot: number }
  | { key: "NO_HOLD" }
  | { key: "SLOT_UNAVAILABLE" }
  | { key: "PAYMENT_PAGE_FAILED" };

export type PlaceOrderResult =
  | { ok: true; orderId: string; orderNumber: string; redirectUrl: string }
  | { ok: false; problem: PlaceOrderProblem };

class Abort extends Error {
  constructor(public problem: PlaceOrderProblem) {
    super(problem.key);
  }
}

/**
 * Turns a cart into an order awaiting payment, atomically: the slot and stock are reserved, the hold
 * becomes a reservation, prices and address are frozen. Payment happens on the provider's page.
 */
export async function placeOrder(
  db: Database,
  provider: PaymentProvider,
  input: { cartId: string; details: CheckoutDetails; locale: "he" | "en"; appUrl: string; now?: Date },
): Promise<PlaceOrderResult> {
  const now = input.now ?? new Date();
  const checked = validateDetails(input.details);
  if (!checked.ok) return { ok: false, problem: { key: "DETAILS_INVALID", errors: checked.errors } };

  // A checkout left unpaid on the payment page is settled first: reused only while fresh and for the same cart,
  // otherwise expired (after asking the provider), so its window and stock are free again and a new page is made.
  const [existing] = await db.select({ convertedOrderId: cart.convertedOrderId }).from(cart).where(eq(cart.id, input.cartId));
  if (existing?.convertedOrderId) {
    const stale = !(await sameContents(db, input.cartId, existing.convertedOrderId));
    await expireIfAbandoned(db, provider, { orderId: existing.convertedOrderId, appUrl: input.appUrl, force: stale, now });
  }

  let placed: { orderId: string; orderNumber: string; accessToken: string; intentId: string; amount: number; mode: "AUTHORIZE" | "CHARGE" };
  try {
    placed = await db.transaction(async (tx) => {
      const [c] = await tx.select().from(cart).where(eq(cart.id, input.cartId)).for("update");
      if (!c || c.status !== "OPEN") throw new Abort({ key: "CART_NOT_FOUND" });
      await tx.update(cart).set({ checkoutDraft: input.details }).where(eq(cart.id, c.id));

      // A double-submitted form must not create a second order.
      if (c.convertedOrderId) {
        const [pending] = await tx.select().from(order).where(eq(order.id, c.convertedOrderId));
        if (pending?.status === "AUTH_PENDING") {
          const [intent] = await tx.select().from(paymentIntent).where(eq(paymentIntent.orderId, pending.id)).orderBy(asc(paymentIntent.createdAt));
          if (intent?.hostedPageUrl) throw new AlreadyPending(pending.id, pending.orderNumber, intent.hostedPageUrl);
        }
      }

      if (!c.zoneId) throw new Abort({ key: "NO_ZONE" });
      const [zone] = await tx.select().from(deliveryZone).where(eq(deliveryZone.id, c.zoneId));

      const lines = await tx
        .select({ line: cartLine, variant: productVariant, product, stock: stockItem })
        .from(cartLine)
        .innerJoin(productVariant, eq(productVariant.id, cartLine.variantId))
        .innerJoin(product, eq(product.id, productVariant.productId))
        .innerJoin(stockItem, eq(stockItem.productId, product.id))
        .where(eq(cartLine.cartId, c.id))
        .orderBy(asc(cartLine.addedAt))
        .for("update", { of: [stockItem] });
      if (lines.length === 0) throw new Abort({ key: "CART_EMPTY" });

      const priced: Array<{ row: (typeof lines)[number]; priced: PricedLine }> = [];
      for (const row of lines) {
        const p = row.product;
        const availability = availabilityOf({
          pricingMode: p.pricingMode,
          onHandG: row.stock.onHandG,
          reservedG: row.stock.reservedG,
          onHandUnits: row.stock.onHandUnits,
          reservedUnits: row.stock.reservedUnits,
          lowThresholdG: 0,
          lowThresholdUnits: 0,
          minOrderG: p.minOrderG,
          nextRestockDate: null,
        });
        const problem: LineProblem | null =
          !p.published || !row.variant.published
            ? { key: "UNAVAILABLE" }
            : p.pricingMode === "WEIGHT"
              ? validateWeight({
                  requestedG: row.line.requestedG ?? 0,
                  minG: p.minOrderG!,
                  maxG: p.maxOrderG!,
                  stepG: p.stepG!,
                  availableG: availability.kind === "OUT" ? 0 : availability.availableG,
                })
              : validateQuantity({ quantity: row.line.quantity ?? 0, availableUnits: availability.kind === "OUT" ? 0 : availability.availableUnits });
        if (problem) throw new Abort({ key: "LINE_CHANGED", productNameHe: p.nameHe, productNameEn: p.nameEn, problem });

        priced.push({
          row,
          priced:
            p.pricingMode === "WEIGHT"
              ? { mode: "WEIGHT", pricePerKg: agorot(p.pricePerKgAgorot! + row.variant.priceDeltaAgorot), requested: grams(row.line.requestedG!), toleranceBp: p.toleranceBp }
              : { mode: "PACKAGE", unitPrice: agorot(p.packagePriceAgorot! + row.variant.priceDeltaAgorot), quantity: row.line.quantity! },
        });
      }

      const quote = quoteCart(
        priced.map((x) => x.priced),
        { deliveryFeeAgorot: zone.deliveryFeeAgorot, freeDeliveryOverAgorot: zone.freeDeliveryOverAgorot, minOrderAgorot: zone.minOrderAgorot },
      );
      if (quote.minOrderGap !== null) throw new Abort({ key: "BELOW_MINIMUM", gapAgorot: quote.minOrderGap });

      const [hold] = await tx
        .select()
        .from(slotHold)
        .where(and(eq(slotHold.cartId, c.id), isNull(slotHold.releasedAt), gt(slotHold.expiresAt, now)));
      if (!hold) throw new Abort({ key: "NO_HOLD" });

      const [slot] = await tx.select().from(deliverySlot).where(eq(deliverySlot.id, hold.slotId)).for("update");
      const orderWeightG = priced.reduce(
        (sum, x) => sum + (x.priced.mode === "WEIGHT" ? x.priced.requested : (x.row.product.packageNominalG ?? 0) * x.priced.quantity),
        0,
      );
      const slotState = slotAvailability(
        {
          status: slot.status,
          startsAt: slot.startsAt,
          cutoffAt: slot.cutoffAt,
          capacityOrders: slot.capacityOrders,
          reservedOrders: slot.reservedOrders,
          // The customer's own hold is the promise. Other carts' holds must not count here: if the
          // window was filled some other way, holders would otherwise block each other forever.
          activeHolds: 0,
          reasonHe: slot.blackoutReasonHe,
          reasonEn: slot.blackoutReasonEn,
        },
        now,
        zone.leadTimeMinutes,
      );
      if (slotState.kind !== "AVAILABLE" || slot.reservedWeightG + orderWeightG > slot.capacityWeightG) {
        throw new Abort({ key: "SLOT_UNAVAILABLE" });
      }
      await tx
        .update(deliverySlot)
        .set({ reservedOrders: sql`${deliverySlot.reservedOrders} + 1`, reservedWeightG: sql`${deliverySlot.reservedWeightG} + ${orderWeightG}` })
        .where(eq(deliverySlot.id, slot.id));
      await tx.update(slotHold).set({ releasedAt: now }).where(eq(slotHold.id, hold.id));

      for (const x of priced) {
        await tx
          .update(stockItem)
          .set(
            x.priced.mode === "WEIGHT"
              ? { reservedG: sql`${stockItem.reservedG} + ${x.priced.requested}` }
              : { reservedUnits: sql`${stockItem.reservedUnits} + ${x.priced.quantity}` },
          )
          .where(eq(stockItem.productId, x.row.product.id));
      }

      const d = input.details;
      const [cust] = await tx
        .insert(customer)
        .values({ phoneE164: checked.phoneE164, firstName: d.firstName.trim(), lastName: d.lastName.trim(), email: d.email.trim() || null, preferredLocale: input.locale })
        .onConflictDoUpdate({
          target: customer.phoneE164,
          set: { firstName: d.firstName.trim(), lastName: d.lastName.trim(), email: d.email.trim() || null, updatedAt: now },
        })
        .returning();
      const addressValues = {
        customerId: cust.id,
        city: c.city ?? zone.nameHe,
        street: d.street.trim(),
        houseNumber: d.houseNumber.trim(),
        entrance: d.entrance.trim() || null,
        floor: d.floor.trim() || null,
        apartment: d.apartment.trim() || null,
        intercom: d.intercom.trim() || null,
        deliveryNotes: d.deliveryNotes.trim() || null,
        zoneId: zone.id,
      };
      await tx.insert(address).values(addressValues);

      const year = new Date(now).getUTCFullYear();
      const [counter] = await tx
        .insert(orderCounter)
        .values({ year, lastSequence: 1 })
        .onConflictDoUpdate({ target: orderCounter.year, set: { lastSequence: sql`${orderCounter.lastSequence} + 1` } })
        .returning();
      const orderNumber = `${year}-${String(counter.lastSequence).padStart(5, "0")}`;
      const accessToken = randomBytes(18).toString("base64url");

      const [created] = await tx
        .insert(order)
        .values({
          orderNumber,
          accessToken,
          cartId: c.id,
          customerId: cust.id,
          addressSnapshot: { ...addressValues, firstName: d.firstName.trim(), lastName: d.lastName.trim(), phoneE164: checked.phoneE164 },
          zoneId: zone.id,
          slotId: slot.id,
          locale: input.locale,
          status: "PLACED",
          itemsEstimateAgorot: quote.itemsEstimate,
          deliveryFeeAgorot: quote.deliveryFee,
          estimateTotalAgorot: quote.estimateTotal,
          authorizationCeilingAgorot: quote.authorizationCeiling,
          vatRateBp: ISRAEL_VAT_BP,
          customerNote: d.deliveryNotes.trim() || null,
          giftRecipient: d.giftRecipient?.trim() || null,
          giftMessage: d.giftMessage?.trim() || null,
          reservedWeightG: orderWeightG,
          placedAt: now,
        })
        .returning();

      await tx.insert(orderLine).values(
        priced.map((x, i) => {
          const base = {
            orderId: created.id,
            variantId: x.row.variant.id,
            productNameHe: x.row.product.nameHe,
            productNameEn: x.row.product.nameEn,
            variantNameHe: x.row.variant.nameHe,
            variantNameEn: x.row.variant.nameEn,
            pricingMode: x.row.product.pricingMode,
            estimateAgorot: lineEstimate(x.priced),
            ceilingAgorot: lineCeiling(x.priced),
            allowSubstitute: x.row.line.allowSubstitute,
            cutInstructionHe: x.row.variant.cutInstructionHe,
            cutInstructionEn: x.row.variant.cutInstructionEn,
            customerNote: x.row.line.customerNote,
            handlingFlags: x.row.product.handlingFlags,
            sortOrder: i,
          };
          if (x.priced.mode === "WEIGHT") {
            const b = toleranceBounds(x.priced.requested, x.priced.toleranceBp);
            return { ...base, pricePerKgAgorot: x.priced.pricePerKg, estimatedG: x.priced.requested, toleranceBp: x.priced.toleranceBp, toleranceMinG: b.min, toleranceMaxG: b.max };
          }
          return { ...base, unitPriceAgorot: x.priced.unitPrice, quantity: x.priced.quantity };
        }),
      );

      await tx.insert(orderStatusEvent).values({
        orderId: created.id,
        fromStatus: null,
        toStatus: "PLACED",
        eventKey: "PLACED",
        actorType: "CUSTOMER",
        actorId: cust.id,
        createdAt: now,
      });
      const mode = quote.hasWeightLines ? ("AUTHORIZE" as const) : ("CHARGE" as const);
      const [intent] = await tx
        .insert(paymentIntent)
        .values({ orderId: created.id, provider: provider.name, sandbox: provider.sandbox, amountAgorot: quote.authorizationCeiling, status: "CREATED", purpose: mode })
        .returning();
      await tx.update(cart).set({ convertedOrderId: created.id }).where(eq(cart.id, c.id));

      const moved = await applyOrderEvent(tx, { orderId: created.id, event: "AUTH_REQUESTED", ctx: { actor: "CUSTOMER" }, appUrl: input.appUrl, now });
      if (!moved.ok) throw new Error(`AUTH_REQUESTED rejected: ${moved.reason}`);

      return { orderId: created.id, orderNumber, accessToken, intentId: intent.id, amount: quote.authorizationCeiling, mode };
    });
  } catch (e) {
    if (e instanceof Abort) return { ok: false, problem: e.problem };
    if (e instanceof AlreadyPending) return { ok: true, orderId: e.orderId, orderNumber: e.orderNumber, redirectUrl: e.url };
    throw e;
  }

  // Outside the transaction: talk to the payment provider.
  try {
    const d = input.details;
    const page = await provider.createHostedPayment({
      intentId: placed.intentId,
      orderNumber: placed.orderNumber,
      amountAgorot: placed.amount,
      mode: placed.mode,
      locale: input.locale,
      customer: { name: `${d.firstName} ${d.lastName}`.trim(), phoneE164: checked.phoneE164, email: d.email.trim() || null },
      returnUrl: `${input.appUrl}/api/payments/return?intent=${placed.intentId}`,
    });
    await db.update(paymentIntent).set({ hostedPageRef: page.pageRef, hostedPageUrl: page.url, status: "REDIRECTED" }).where(eq(paymentIntent.id, placed.intentId));
    return { ok: true, orderId: placed.orderId, orderNumber: placed.orderNumber, redirectUrl: page.url };
  } catch {
    // The provider is unreachable: undo the reservation so nothing is stuck, and say so.
    await db.transaction((tx) =>
      applyOrderEvent(tx, { orderId: placed.orderId, event: "AUTH_TIMED_OUT", ctx: { actor: "SYSTEM" }, reasonKey: "PAYMENT_PAGE_FAILED", appUrl: input.appUrl }),
    );
    return { ok: false, problem: { key: "PAYMENT_PAGE_FAILED" } };
  }
}

class AlreadyPending extends Error {
  constructor(
    public orderId: string,
    public orderNumber: string,
    public url: string,
  ) {
    super("ALREADY_PENDING");
  }
}

/** Whether a pending order was placed from exactly what the cart holds now. */
async function sameContents(db: Database, cartId: string, orderId: string) {
  const [lines, ordered] = await Promise.all([
    db.select({ variantId: cartLine.variantId, g: cartLine.requestedG, q: cartLine.quantity }).from(cartLine).where(eq(cartLine.cartId, cartId)),
    db.select({ variantId: orderLine.variantId, g: orderLine.estimatedG, q: orderLine.quantity }).from(orderLine).where(eq(orderLine.orderId, orderId)),
  ]);
  const key = (rows: Array<{ variantId: string; g: number | null; q: number | null }>) => rows.map((r) => `${r.variantId}:${r.g ?? ""}:${r.q ?? ""}`).sort().join("|");
  return key(lines) === key(ordered);
}
