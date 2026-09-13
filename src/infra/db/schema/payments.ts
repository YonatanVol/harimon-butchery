import { sql } from "drizzle-orm";
import { boolean, check, index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { agorotCol, createdAt } from "./columns";
import { captureStatus, paymentIntentStatus, paymentProvider, refundStatus } from "./enums";
import { order } from "./orders";
import { staffUser } from "./people";

/**
 * A card hold (J5). No card number, CVV or track data is ever stored — only the provider's
 * transaction reference, a token, and display details (brand, last 4).
 */
export const paymentIntent = pgTable(
  "payment_intent",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => order.id, { onDelete: "cascade" }),
    provider: paymentProvider("provider").notNull(),
    sandbox: boolean("sandbox").notNull(),
    purpose: text("purpose").notNull().default("ORDER"),
    amountAgorot: agorotCol("amount_agorot").notNull(),
    status: paymentIntentStatus("status").notNull().default("CREATED"),
    hostedPageRef: text("hosted_page_ref"),
    hostedPageUrl: text("hosted_page_url"),
    providerTransactionRef: text("provider_transaction_ref"),
    approvalNumber: text("approval_number"),
    tokenRef: text("token_ref"),
    cardBrand: text("card_brand"),
    cardLast4: text("card_last4"),
    declineCode: text("decline_code"),
    declineReasonKey: text("decline_reason_key"),
    rawResponse: jsonb("raw_response"),
    createdAt: createdAt(),
    authorizedAt: timestamp("authorized_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (t) => [
    index("payment_intent_order_idx").on(t.orderId),
    check("payment_intent_amount", sql`${t.amountAgorot} > 0`),
    check("payment_intent_last4", sql`${t.cardLast4} IS NULL OR ${t.cardLast4} ~ '^[0-9]{4}$'`),
  ],
);

export const paymentCapture = pgTable(
  "payment_capture",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    paymentIntentId: uuid("payment_intent_id")
      .notNull()
      .references(() => paymentIntent.id, { onDelete: "cascade" }),
    amountAgorot: agorotCol("amount_agorot").notNull(),
    status: captureStatus("status").notNull().default("PENDING"),
    attempt: integer("attempt").notNull(),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    providerCaptureRef: text("provider_capture_ref"),
    failureCode: text("failure_code"),
    failureReasonKey: text("failure_reason_key"),
    rawResponse: jsonb("raw_response"),
    createdAt: createdAt(),
    settledAt: timestamp("settled_at", { withTimezone: true }),
  },
  (t) => [check("payment_capture_amount", sql`${t.amountAgorot} >= 0`)],
);

export const paymentRefund = pgTable(
  "payment_refund",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    paymentIntentId: uuid("payment_intent_id")
      .notNull()
      .references(() => paymentIntent.id, { onDelete: "cascade" }),
    amountAgorot: agorotCol("amount_agorot").notNull(),
    reasonKey: text("reason_key").notNull(),
    requestedByStaffId: uuid("requested_by_staff_id").references(() => staffUser.id),
    status: refundStatus("status").notNull().default("PENDING"),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    providerRefundRef: text("provider_refund_ref"),
    rawResponse: jsonb("raw_response"),
    createdAt: createdAt(),
  },
  (t) => [check("payment_refund_amount", sql`${t.amountAgorot} > 0`)],
);

/** Inbox of provider callbacks. Processing is idempotent on `provider_event_id`. */
export const paymentWebhookEvent = pgTable("payment_webhook_event", {
  id: uuid("id").primaryKey().defaultRandom(),
  provider: paymentProvider("provider").notNull(),
  providerEventId: text("provider_event_id").notNull().unique(),
  payload: jsonb("payload").notNull(),
  receivedAt: createdAt(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  processingError: text("processing_error"),
});

/** Israeli invoices are numbered sequentially per year with no gaps. */
export const invoice = pgTable("invoice", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .unique()
    .references(() => order.id),
  year: integer("year").notNull(),
  sequence: integer("sequence").notNull(),
  number: text("number").notNull().unique(),
  grossAgorot: agorotCol("gross_agorot").notNull(),
  vatAgorot: agorotCol("vat_agorot").notNull(),
  netAgorot: agorotCol("net_agorot").notNull(),
  vatRateBp: integer("vat_rate_bp").notNull(),
  lines: jsonb("lines").notNull(),
  issuedAt: createdAt(),
});

export const invoiceCounter = pgTable("invoice_counter", {
  year: integer("year").primaryKey(),
  lastSequence: integer("last_sequence").notNull().default(0),
});

/**
 * State of the built-in demo payment gateway. It plays the role a real PSP plays — holding,
 * charging, refunding — so the whole money flow runs with no credentials. Never used with PAYPLUS.
 */
export const mockPspTransaction = pgTable("mock_psp_transaction", {
  ref: text("ref").primaryKey(),
  mode: text("mode").notNull(), // AUTHORIZE | CHARGE
  amountAgorot: agorotCol("amount_agorot").notNull(),
  status: text("status").notNull().default("CREATED"), // CREATED | APPROVED | DECLINED | VOIDED
  scenario: text("scenario"),
  capturedAgorot: agorotCol("captured_agorot").notNull().default(0),
  refundedAgorot: agorotCol("refunded_agorot").notNull().default(0),
  tokenRef: text("token_ref"),
  cardBrand: text("card_brand"),
  cardLast4: text("card_last4"),
  declineCode: text("decline_code"),
  returnUrl: text("return_url").notNull(),
  orderNumber: text("order_number").notNull(),
  locale: text("locale").notNull(),
  createdAt: createdAt(),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
});

/** Idempotency for the demo gateway: a repeated money call with the same key returns the first result, like a real processor. */
export const mockPspOperation = pgTable("mock_psp_operation", {
  idempotencyKey: text("idempotency_key").primaryKey(),
  result: jsonb("result").notNull(),
  createdAt: createdAt(),
});
