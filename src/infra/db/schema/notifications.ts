import { index, jsonb, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createdAt } from "./columns";
import { notificationChannel, notificationProvider, notificationStatus } from "./enums";
import { order } from "./orders";
import { customer } from "./people";

/**
 * Every message to a customer. The rendered body is always stored — including in demo mode,
 * where nothing is actually sent — so the message timeline shows exactly what would have arrived.
 */
export const notification = pgTable(
  "notification",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id").references(() => order.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id").references(() => customer.id, { onDelete: "set null" }),
    templateKey: text("template_key").notNull(),
    channel: notificationChannel("channel").notNull(),
    provider: notificationProvider("provider").notNull(),
    toE164: text("to_e164").notNull(),
    locale: text("locale").notNull(),
    renderedBody: text("rendered_body").notNull(),
    actions: jsonb("actions"),
    status: notificationStatus("status").notNull().default("QUEUED"),
    providerMessageId: text("provider_message_id"),
    failureReason: text("failure_reason"),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    queuedAt: createdAt(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    readAt: timestamp("read_at", { withTimezone: true }),
  },
  (t) => [
    index("notification_order_idx").on(t.orderId, t.queuedAt),
    index("notification_queued_idx").on(t.queuedAt),
  ],
);

export const notificationSuppression = pgTable(
  "notification_suppression",
  {
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customer.id, { onDelete: "cascade" }),
    channel: notificationChannel("channel").notNull(),
    reason: text("reason").notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.customerId, t.channel] })],
);
