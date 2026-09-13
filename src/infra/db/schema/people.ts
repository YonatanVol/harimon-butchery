import { sql } from "drizzle-orm";
import { boolean, check, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createdAt, hebrewText, updatedAt } from "./columns";
import { deliveryZone } from "./delivery";
import { staffRole } from "./enums";

export const customer = pgTable(
  "customer",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    phoneE164: text("phone_e164").notNull().unique(),
    phoneVerifiedAt: timestamp("phone_verified_at", { withTimezone: true }),
    email: text("email"),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    preferredLocale: text("preferred_locale").notNull().default("he"),
    marketingOptIn: boolean("marketing_opt_in").notNull().default(false),
    notes: text("notes"),
    blockedAt: timestamp("blocked_at", { withTimezone: true }),
    blockedReason: text("blocked_reason"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("customer_locale", sql`${t.preferredLocale} IN ('he', 'en')`),
    check("customer_phone_e164", sql`${t.phoneE164} ~ '^\\+972[0-9]{8,9}$'`),
  ],
);

/** Israeli addresses: city, street, house, entrance, floor, apartment, intercom. No postcode dependence. */
export const address = pgTable(
  "address",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customer.id, { onDelete: "cascade" }),
    label: text("label"),
    city: hebrewText("city").notNull(),
    street: hebrewText("street").notNull(),
    houseNumber: text("house_number").notNull(),
    entrance: text("entrance"),
    floor: text("floor"),
    apartment: text("apartment"),
    intercom: text("intercom"),
    hasElevator: boolean("has_elevator"),
    deliveryNotes: text("delivery_notes"),
    recipientName: text("recipient_name"),
    recipientPhoneE164: text("recipient_phone_e164"),
    zoneId: uuid("zone_id").references(() => deliveryZone.id),
    isDefault: boolean("is_default").notNull().default(false),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("address_customer_idx").on(t.customerId)],
);

export const staffUser = pgTable("staff_user", {
  id: uuid("id").primaryKey().defaultRandom(),
  phoneE164: text("phone_e164").notNull().unique(),
  fullNameHe: hebrewText("full_name_he").notNull(),
  fullNameEn: text("full_name_en").notNull(),
  role: staffRole("role").notNull(),
  pinHash: text("pin_hash"),
  failedPinAttempts: integer("failed_pin_attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  active: boolean("active").notNull().default(true),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  createdAt: createdAt(),
});
