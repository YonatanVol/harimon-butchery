import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgTable,
  smallint,
  text,
  time,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { agorotCol, createdAt, gramsCol, hebrewText } from "./columns";
import { blackoutSource, slotStatus } from "./enums";

export const deliveryZone = pgTable("delivery_zone", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  nameHe: hebrewText("name_he").notNull(),
  nameEn: text("name_en").notNull(),
  citiesHe: text("cities_he").array().notNull(),
  citiesEn: text("cities_en").array().notNull(),
  deliveryFeeAgorot: agorotCol("delivery_fee_agorot").notNull(),
  freeDeliveryOverAgorot: agorotCol("free_delivery_over_agorot"),
  minOrderAgorot: agorotCol("min_order_agorot").notNull(),
  leadTimeMinutes: integer("lead_time_minutes").notNull(),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const deliverySlotTemplate = pgTable(
  "delivery_slot_template",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    zoneId: uuid("zone_id")
      .notNull()
      .references(() => deliveryZone.id, { onDelete: "cascade" }),
    /** 0 = Sunday … 6 = Saturday (Israeli week starts on Sunday). */
    weekday: smallint("weekday").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    capacityOrders: integer("capacity_orders").notNull(),
    capacityWeightG: gramsCol("capacity_weight_g").notNull(),
    cutoffLeadMinutes: integer("cutoff_lead_minutes").notNull(),
    active: boolean("active").notNull().default(true),
  },
  (t) => [
    check("template_weekday", sql`${t.weekday} BETWEEN 0 AND 6`),
    check("template_times", sql`${t.startTime} < ${t.endTime}`),
  ],
);

export const deliverySlot = pgTable(
  "delivery_slot",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    zoneId: uuid("zone_id")
      .notNull()
      .references(() => deliveryZone.id, { onDelete: "cascade" }),
    templateId: uuid("template_id").references(() => deliverySlotTemplate.id, { onDelete: "set null" }),
    serviceDate: date("service_date").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    cutoffAt: timestamp("cutoff_at", { withTimezone: true }).notNull(),
    capacityOrders: integer("capacity_orders").notNull(),
    reservedOrders: integer("reserved_orders").notNull().default(0),
    capacityWeightG: gramsCol("capacity_weight_g").notNull(),
    reservedWeightG: gramsCol("reserved_weight_g").notNull().default(0),
    status: slotStatus("status").notNull().default("OPEN"),
    blackoutReasonHe: text("blackout_reason_he"),
    blackoutReasonEn: text("blackout_reason_en"),
    hebrewDateHe: text("hebrew_date_he"),
    generatedAt: createdAt(),
  },
  (t) => [
    unique("slot_zone_start_uq").on(t.zoneId, t.startsAt),
    index("slot_zone_date_idx").on(t.zoneId, t.serviceDate),
    check("slot_orders_capacity", sql`${t.reservedOrders} >= 0 AND ${t.reservedOrders} <= ${t.capacityOrders}`),
    check("slot_weight_capacity", sql`${t.reservedWeightG} >= 0 AND ${t.reservedWeightG} <= ${t.capacityWeightG}`),
    check("slot_times", sql`${t.startsAt} < ${t.endsAt} AND ${t.cutoffAt} <= ${t.startsAt}`),
  ],
);

/** A 15-minute hold on a slot during checkout. Expired holds are ignored at read time. */
export const slotHold = pgTable(
  "slot_hold",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slotId: uuid("slot_id")
      .notNull()
      .references(() => deliverySlot.id, { onDelete: "cascade" }),
    cartId: uuid("cart_id").notNull(),
    weightG: gramsCol("weight_g").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    releasedAt: timestamp("released_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("slot_hold_slot_idx").on(t.slotId, t.expiresAt)],
);

/**
 * Days or hours with no delivery. HEBCAL rows are regenerated from the Jewish calendar;
 * MANUAL rows are a person's decision and are never overwritten by automation.
 */
export const calendarBlackout = pgTable(
  "calendar_blackout",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    date: date("date").notNull(),
    fromTime: time("from_time"),
    toTime: time("to_time"),
    zoneId: uuid("zone_id").references(() => deliveryZone.id, { onDelete: "cascade" }),
    reasonHe: text("reason_he").notNull(),
    reasonEn: text("reason_en").notNull(),
    source: blackoutSource("source").notNull(),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [index("blackout_date_idx").on(t.date)],
);
