import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { product } from "./catalog";
import { createdAt, hebrewText, updatedAt } from "./columns";
import { reviewStatus } from "./enums";
import { order } from "./orders";
import { customer, staffUser } from "./people";

/**
 * A customer's review of a cut they were actually delivered. The order it came from is required, so
 * "verified purchase" is a fact of the schema and not a badge we hand out. One review per cut per order.
 * Nothing is shown on the site before a staff member publishes it.
 */
export const productReview = pgTable(
  "product_review",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    orderId: uuid("order_id")
      .notNull()
      .references(() => order.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customer.id, { onDelete: "cascade" }),
    /** Whole stars, 1–5. */
    rating: integer("rating").notNull(),
    body: hebrewText("body").notNull(),
    /** First name plus one initial, frozen at write time so a later name change doesn't rewrite history. */
    displayName: hebrewText("display_name").notNull(),
    locale: text("locale").notNull().default("he"),
    status: reviewStatus("status").notNull().default("PENDING"),
    /** Why a review was rejected — for the staff log, never shown on the storefront. */
    moderationNote: text("moderation_note"),
    moderatedByStaffId: uuid("moderated_by_staff_id").references(() => staffUser.id),
    moderatedAt: timestamp("moderated_at", { withTimezone: true }),
    /** The butcher's public answer, shown under the review. */
    replyBody: hebrewText("reply_body"),
    repliedAt: timestamp("replied_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("product_review_once_per_order").on(t.orderId, t.productId),
    index("product_review_product_idx").on(t.productId, t.status, t.createdAt),
    index("product_review_pending_idx").on(t.status, t.createdAt),
    index("product_review_customer_idx").on(t.customerId, t.createdAt),
    check("product_review_rating_range", sql`${t.rating} BETWEEN 1 AND 5`),
    check("product_review_body_length", sql`char_length(${t.body}) BETWEEN 10 AND 600`),
    check("product_review_locale", sql`${t.locale} IN ('he', 'en')`),
    // A reply is either there with its time, or not there at all.
    check("product_review_reply_paired", sql`(${t.replyBody} IS NULL) = (${t.repliedAt} IS NULL)`),
  ],
);
