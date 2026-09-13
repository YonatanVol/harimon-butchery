import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { productVariant } from "./catalog";
import { agorotCol, createdAt, gramsCol, updatedAt } from "./columns";
import { deliverySlot, deliveryZone } from "./delivery";
import {
  actorType,
  cartStatus,
  handlingFlag,
  orderLineStatus,
  orderStatus,
  overTolerancePolicy,
  pricingMode,
  weighingSource,
} from "./enums";
import { address, customer, staffUser } from "./people";

/** A cart shows live catalog prices. Prices are frozen only when an order is placed. */
export const cart = pgTable(
  "cart",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id").references(() => customer.id, { onDelete: "set null" }),
    anonymousToken: text("anonymous_token").unique(),
    locale: text("locale").notNull().default("he"),
    city: text("city"),
    zoneId: uuid("zone_id").references(() => deliveryZone.id),
    addressId: uuid("address_id").references(() => address.id),
    status: cartStatus("status").notNull().default("OPEN"),
    /** Set while an order from this cart awaits payment; cleared if payment fails so the cart stays usable. */
    convertedOrderId: uuid("converted_order_id"),
    checkoutDraft: jsonb("checkout_draft"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("cart_one_open_per_customer").on(t.customerId).where(sql`${t.status} = 'OPEN' AND ${t.customerId} IS NOT NULL`),
    check("cart_owner", sql`${t.customerId} IS NOT NULL OR ${t.anonymousToken} IS NOT NULL`),
  ],
);

export const cartLine = pgTable(
  "cart_line",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cartId: uuid("cart_id")
      .notNull()
      .references(() => cart.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariant.id),
    requestedG: gramsCol("requested_g"),
    quantity: integer("quantity"),
    allowSubstitute: boolean("allow_substitute").notNull().default(true),
    customerNote: text("customer_note"),
    addedAt: createdAt(),
  },
  (t) => [
    index("cart_line_cart_idx").on(t.cartId),
    check(
      "cart_line_amount",
      sql`(${t.requestedG} > 0 AND ${t.quantity} IS NULL) OR (${t.quantity} > 0 AND ${t.requestedG} IS NULL)`,
    ),
  ],
);

export const order = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderNumber: text("order_number").notNull().unique(),
    /** Unguessable token for the no-login tracking link sent to the customer. */
    accessToken: text("access_token").notNull().unique(),
    cartId: uuid("cart_id"),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customer.id),
    addressSnapshot: jsonb("address_snapshot").notNull(),
    zoneId: uuid("zone_id")
      .notNull()
      .references(() => deliveryZone.id),
    slotId: uuid("slot_id").references(() => deliverySlot.id),
    locale: text("locale").notNull(),
    status: orderStatus("status").notNull(),
    partiallyFulfilled: boolean("partially_fulfilled").notNull().default(false),
    unpaidDispatch: boolean("unpaid_dispatch").notNull().default(false),

    itemsEstimateAgorot: agorotCol("items_estimate_agorot").notNull(),
    deliveryFeeAgorot: agorotCol("delivery_fee_agorot").notNull(),
    estimateTotalAgorot: agorotCol("estimate_total_agorot").notNull(),
    authorizationCeilingAgorot: agorotCol("authorization_ceiling_agorot").notNull(),
    itemsFinalAgorot: agorotCol("items_final_agorot"),
    finalTotalAgorot: agorotCol("final_total_agorot"),
    capturedAgorot: agorotCol("captured_agorot"),
    refundedAgorot: agorotCol("refunded_agorot").notNull().default(0),
    goodwillAgorot: agorotCol("goodwill_agorot").notNull().default(0),
    /** Extra weight the customer approved, charged separately on their saved card. */
    extraChargedAgorot: agorotCol("extra_charged_agorot").notNull().default(0),
    approvalDeadlineAt: timestamp("approval_deadline_at", { withTimezone: true }),
    vatRateBp: integer("vat_rate_bp").notNull(),
    overTolerancePolicy: overTolerancePolicy("over_tolerance_policy").notNull().default("TRIM_TO_CEILING"),

    placedAt: timestamp("placed_at", { withTimezone: true }).notNull().defaultNow(),
    authorizedAt: timestamp("authorized_at", { withTimezone: true }),
    pickingStartedAt: timestamp("picking_started_at", { withTimezone: true }),
    weighedAt: timestamp("weighed_at", { withTimezone: true }),
    capturedAt: timestamp("captured_at", { withTimezone: true }),
    packedAt: timestamp("packed_at", { withTimezone: true }),
    dispatchedAt: timestamp("dispatched_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelReasonKey: text("cancel_reason_key"),

    assignedButcherId: uuid("assigned_butcher_id").references(() => staffUser.id),
    assignedDriverId: uuid("assigned_driver_id").references(() => staffUser.id),
    customerNote: text("customer_note"),
    internalNote: text("internal_note"),
    deliveryAttempts: integer("delivery_attempts").notNull().default(0),
    /** Weight added to the delivery window at placement, so releasing undoes exactly that. */
    reservedWeightG: gramsCol("reserved_weight_g").notNull().default(0),
    version: integer("version").notNull().default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("orders_status_idx").on(t.status),
    index("orders_slot_idx").on(t.slotId),
    index("orders_customer_idx").on(t.customerId, t.placedAt),
    // The central money invariant, enforced by the database itself.
    check("orders_capture_within_hold", sql`${t.capturedAgorot} IS NULL OR ${t.capturedAgorot} <= ${t.authorizationCeilingAgorot}`),
    check("orders_refund_within_capture", sql`${t.refundedAgorot} >= 0 AND ${t.refundedAgorot} <= coalesce(${t.capturedAgorot}, 0)`),
    check("orders_locale", sql`${t.locale} IN ('he', 'en')`),
  ],
);

export const orderCounter = pgTable("order_counter", {
  year: integer("year").primaryKey(),
  lastSequence: integer("last_sequence").notNull().default(0),
});

export const orderLine = pgTable(
  "order_line",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => order.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariant.id),
    productNameHe: text("product_name_he").notNull(),
    productNameEn: text("product_name_en").notNull(),
    variantNameHe: text("variant_name_he").notNull(),
    variantNameEn: text("variant_name_en").notNull(),
    pricingMode: pricingMode("pricing_mode").notNull(),

    pricePerKgAgorot: agorotCol("price_per_kg_agorot"),
    estimatedG: gramsCol("estimated_g"),
    toleranceBp: integer("tolerance_bp"),
    toleranceMinG: gramsCol("tolerance_min_g"),
    toleranceMaxG: gramsCol("tolerance_max_g"),
    actualG: gramsCol("actual_g"),
    /** Weight awaiting the customer's decision (over the range). */
    pendingActualG: gramsCol("pending_actual_g"),

    unitPriceAgorot: agorotCol("unit_price_agorot"),
    quantity: integer("quantity"),
    actualQuantity: integer("actual_quantity"),

    estimateAgorot: agorotCol("estimate_agorot").notNull(),
    ceilingAgorot: agorotCol("ceiling_agorot").notNull(),
    finalAgorot: agorotCol("final_agorot"),
    status: orderLineStatus("status").notNull().default("PENDING"),

    substitutedWithVariantId: uuid("substituted_with_variant_id").references(() => productVariant.id),
    substitutionReasonKey: text("substitution_reason_key"),
    allowSubstitute: boolean("allow_substitute").notNull().default(true),
    weighedByStaffId: uuid("weighed_by_staff_id").references(() => staffUser.id),
    weighedAt: timestamp("weighed_at", { withTimezone: true }),
    weighingSource: weighingSource("weighing_source"),
    cutInstructionHe: text("cut_instruction_he"),
    cutInstructionEn: text("cut_instruction_en"),
    customerNote: text("customer_note"),
    handlingFlags: handlingFlag("handling_flags").array().notNull().default(sql`'{}'`),
    handlingConfirmedAt: timestamp("handling_confirmed_at", { withTimezone: true }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [
    index("order_line_order_idx").on(t.orderId, t.sortOrder),
    check("order_line_actual_positive", sql`${t.actualG} IS NULL OR ${t.actualG} > 0`),
    check(
      "order_line_weight_fields",
      sql`${t.pricingMode} <> 'WEIGHT' OR (${t.pricePerKgAgorot} > 0 AND ${t.estimatedG} > 0 AND ${t.toleranceMinG} <= ${t.estimatedG} AND ${t.estimatedG} <= ${t.toleranceMaxG})`,
    ),
    check(
      "order_line_package_fields",
      sql`${t.pricingMode} <> 'PACKAGE' OR (${t.unitPriceAgorot} > 0 AND ${t.quantity} > 0)`,
    ),
    check("order_line_final_within_ceiling", sql`${t.finalAgorot} IS NULL OR ${t.finalAgorot} <= ${t.ceilingAgorot}`),
  ],
);

/** Append-only order history. Drives the customer timeline and the staff audit view. */
export const orderStatusEvent = pgTable(
  "order_status_event",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => order.id, { onDelete: "cascade" }),
    fromStatus: orderStatus("from_status"),
    toStatus: orderStatus("to_status").notNull(),
    eventKey: text("event_key").notNull(),
    reasonKey: text("reason_key"),
    actorType: actorType("actor_type").notNull(),
    actorId: uuid("actor_id"),
    payload: jsonb("payload"),
    createdAt: createdAt(),
  },
  (t) => [index("order_event_order_idx").on(t.orderId, t.createdAt)],
);
