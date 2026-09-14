import { and, desc, eq, lt } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { DeclineReason, PaymentLookup, PaymentProvider } from "@/domain/payments/provider";
import { holdSlotForCart } from "../cart/holds";
import type * as schema from "../db/schema";
import { auditEvent, order, paymentIntent, paymentRefund } from "../db/schema";
import { applyOrderEvent } from "./events";

type Database = NodePgDatabase<typeof schema>;

/** How long we treat a card hold as valid before refusing to capture on it. Conservative; see ADR. */
export const HOLD_VALID_DAYS = 5;

export type AuthorizationOutcome =
  | { kind: "APPROVED"; orderNumber: string; accessToken: string; locale: string }
  | { kind: "DECLINED"; reason: DeclineReason | "AMOUNT_MISMATCH" | "PAGE_EXPIRED" | "PAGE_EXPIRED_NOT_RETURNED"; locale: string }
  | { kind: "PENDING"; hostedPageUrl: string | null; locale: string }
  | { kind: "NOT_FOUND" };

/**
 * Settles a payment attempt. The browser redirect only tells us *which* attempt to check —
 * the result always comes from asking the provider directly. Safe to call any number of times.
 */
export async function resolveAuthorization(
  db: Database,
  provider: PaymentProvider,
  { intentId, appUrl, now = new Date() }: { intentId: string; appUrl: string; now?: Date },
): Promise<AuthorizationOutcome> {
  const [row] = await db
    .select({ intent: paymentIntent, order })
    .from(paymentIntent)
    .innerJoin(order, eq(order.id, paymentIntent.orderId))
    .where(eq(paymentIntent.id, intentId));
  if (!row) return { kind: "NOT_FOUND" };
  const { intent, order: o } = row;

  if (intent.status === "AUTHORIZED") return { kind: "APPROVED", orderNumber: o.orderNumber, accessToken: o.accessToken, locale: o.locale };
  if (intent.status === "DECLINED") return { kind: "DECLINED", reason: (intent.declineReasonKey as DeclineReason) ?? "GENERIC_DECLINE", locale: o.locale };
  if (!intent.hostedPageRef) return { kind: "PENDING", hostedPageUrl: null, locale: o.locale };

  const result = await provider.lookup(intent.hostedPageRef);

  // The page was abandoned and its order expired, but the customer paid it anyway: give the money straight back.
  if (intent.status === "EXPIRED") return returnLatePayment(db, provider, { intent, result, locale: o.locale, orderId: o.id });
  if (result.kind === "PENDING" || result.kind === "NOT_FOUND") {
    return { kind: "PENDING", hostedPageUrl: intent.hostedPageUrl, locale: o.locale };
  }

  if (result.kind === "APPROVED" && result.amountAgorot !== intent.amountAgorot) {
    // Never proceed on a hold for a different amount than we asked for.
    await provider.voidAuthorization({ transactionRef: result.transactionRef });
    await declineInTx(db, intent.id, o.id, "AMOUNT_MISMATCH", "AMT", appUrl, now);
    await restoreHold(db, o, now);
    return { kind: "DECLINED", reason: "AMOUNT_MISMATCH", locale: o.locale };
  }

  if (result.kind === "APPROVED") {
    try {
    await db.transaction(async (tx) => {
      const [locked] = await tx.select().from(paymentIntent).where(eq(paymentIntent.id, intent.id)).for("update");
      if (locked.status === "AUTHORIZED") return;
      // The sweep expired this page between our read and this lock: the payment is late, not an approval.
      if (locked.status === "EXPIRED") throw new ExpiredMeanwhile();
      await tx
        .update(paymentIntent)
        .set({
          status: "AUTHORIZED",
          providerTransactionRef: result.transactionRef,
          approvalNumber: result.approvalNumber,
          tokenRef: result.tokenRef,
          cardBrand: result.cardBrand,
          cardLast4: result.cardLast4,
          authorizedAt: now,
          expiresAt: new Date(now.getTime() + HOLD_VALID_DAYS * 86_400_000),
        })
        .where(eq(paymentIntent.id, intent.id));
      const moved = await applyOrderEvent(tx, { orderId: o.id, event: "AUTH_APPROVED", ctx: { actor: "PSP" }, appUrl, now });
      if (!moved.ok) throw new Error(`AUTH_APPROVED rejected for ${o.orderNumber}: ${moved.reason}`);
    });
    } catch (e) {
      if (!(e instanceof ExpiredMeanwhile)) throw e;
      const [expired] = await db.select().from(paymentIntent).where(eq(paymentIntent.id, intent.id));
      return returnLatePayment(db, provider, { intent: expired, result, locale: o.locale, orderId: o.id });
    }
    return { kind: "APPROVED", orderNumber: o.orderNumber, accessToken: o.accessToken, locale: o.locale };
  }

  await declineInTx(db, intent.id, o.id, result.reason, result.code, appUrl, now);
  await restoreHold(db, o, now);
  return { kind: "DECLINED", reason: result.reason, locale: o.locale };
}

async function declineInTx(db: Database, intentId: string, orderId: string, reason: string, code: string, appUrl: string, now: Date) {
  await db.transaction(async (tx) => {
    const [locked] = await tx.select().from(paymentIntent).where(eq(paymentIntent.id, intentId)).for("update");
    if (locked.status === "DECLINED") return;
    await tx.update(paymentIntent).set({ status: "DECLINED", declineCode: code, declineReasonKey: reason }).where(eq(paymentIntent.id, intentId));
    await applyOrderEvent(tx, { orderId, event: "AUTH_DECLINED", ctx: { actor: "PSP" }, reasonKey: reason, appUrl, now });
  });
}

/** After a decline the customer should be able to retry at once, in the same delivery window if it's still free. */
async function restoreHold(db: Database, o: typeof order.$inferSelect, now: Date) {
  if (!o.cartId || !o.slotId) return;
  await holdSlotForCart(db, { cartId: o.cartId, zoneId: o.zoneId, slotId: o.slotId, now }).catch(() => null);
}

/** A payment page older than this is treated as abandoned (PayPlus pages are created with a 30-minute expiry). */
export const ABANDONED_AFTER_MINUTES = 25;

/**
 * An order still waiting for payment, whose page was abandoned: ask the provider first (the customer may have
 * paid after all); if still unpaid, expire it, which frees its delivery window and stock and reopens the cart.
 */
export async function expireIfAbandoned(db: Database, provider: PaymentProvider, { orderId, appUrl, force = false, now = new Date() }: { orderId: string; appUrl: string; force?: boolean; now?: Date }) {
  const [intent] = await db.select().from(paymentIntent).where(eq(paymentIntent.orderId, orderId)).orderBy(desc(paymentIntent.createdAt)).limit(1);
  if (!intent || (intent.status !== "CREATED" && intent.status !== "REDIRECTED")) return "NOT_PENDING" as const;
  if (!force && now.getTime() - intent.createdAt.getTime() < ABANDONED_AFTER_MINUTES * 60_000) return "STILL_OPEN" as const;

  const outcome = await resolveAuthorization(db, provider, { intentId: intent.id, appUrl, now });
  if (outcome.kind !== "PENDING") return "SETTLED" as const;

  await db.transaction(async (tx) => {
    const [locked] = await tx.select().from(paymentIntent).where(eq(paymentIntent.id, intent.id)).for("update");
    if (locked.status !== "CREATED" && locked.status !== "REDIRECTED") return;
    await tx.update(paymentIntent).set({ status: "EXPIRED" }).where(eq(paymentIntent.id, intent.id));
    await applyOrderEvent(tx, { orderId, event: "AUTH_TIMED_OUT", ctx: { actor: "SYSTEM" }, reasonKey: "PAGE_ABANDONED", appUrl, now });
  });
  return "EXPIRED" as const;
}

/** Sweep every abandoned payment page. Cheap; called when staff open the board. */
export async function expireAbandonedCheckouts(db: Database, provider: PaymentProvider, { appUrl, now = new Date() }: { appUrl: string; now?: Date }) {
  const pending = await db
    .select({ id: order.id })
    .from(order)
    .where(and(eq(order.status, "AUTH_PENDING"), lt(order.createdAt, new Date(now.getTime() - ABANDONED_AFTER_MINUTES * 60_000))));
  let expired = 0;
  for (const o of pending) if ((await expireIfAbandoned(db, provider, { orderId: o.id, appUrl, now })) === "EXPIRED") expired++;
  return expired;
}

class ExpiredMeanwhile extends Error {}

/**
 * The customer paid a page whose order had already expired. Their money goes straight back — the hold released
 * or the charge refunded — and the outcome is recorded. If the provider refuses, the customer is told plainly and
 * the board shows it to staff; nothing is kept silently.
 */
async function returnLatePayment(
  db: Database,
  provider: PaymentProvider,
  { intent, result, locale, orderId }: { intent: typeof paymentIntent.$inferSelect; result: Extract<PaymentLookup, { kind: "APPROVED" }> | Exclude<PaymentLookup, { kind: "APPROVED" }>; locale: string; orderId: string },
): Promise<AuthorizationOutcome> {
  if (result.kind !== "APPROVED") return { kind: "DECLINED", reason: "PAGE_EXPIRED", locale };
  if (intent.providerTransactionRef === result.transactionRef && intent.declineCode === "LATE_PAYMENT_RETURNED") return { kind: "DECLINED", reason: "PAGE_EXPIRED", locale };

  let ok: boolean;
  if (intent.purpose === "AUTHORIZE") {
    ok = (await provider.voidAuthorization({ transactionRef: result.transactionRef })).ok;
  } else {
    const idempotencyKey = `intent:${intent.id}:late-payment`;
    const r = await provider.refund({ transactionRef: result.transactionRef, amountAgorot: result.amountAgorot, idempotencyKey });
    ok = r.ok;
    await db
      .insert(paymentRefund)
      .values({ paymentIntentId: intent.id, amountAgorot: result.amountAgorot, reasonKey: "LATE_PAYMENT_ON_EXPIRED_PAGE", status: r.ok ? "SUCCEEDED" : "FAILED", idempotencyKey, providerRefundRef: r.ok ? r.refundRef : null })
      .onConflictDoUpdate({ target: paymentRefund.idempotencyKey, set: { status: r.ok ? "SUCCEEDED" : "FAILED", providerRefundRef: r.ok ? r.refundRef : null } });
  }
  await db
    .update(paymentIntent)
    .set({ providerTransactionRef: result.transactionRef, cardBrand: result.cardBrand, cardLast4: result.cardLast4, declineCode: ok ? "LATE_PAYMENT_RETURNED" : "LATE_PAYMENT_NOT_RETURNED" })
    .where(eq(paymentIntent.id, intent.id));
  await db.insert(auditEvent).values({
    actorType: "SYSTEM",
    entityType: "order",
    entityId: orderId,
    action: ok ? "payment.late_payment_returned" : "payment.late_payment_not_returned",
    after: { amountAgorot: result.amountAgorot, transactionRef: result.transactionRef, purpose: intent.purpose },
  });
  return { kind: "DECLINED", reason: ok ? "PAGE_EXPIRED" : "PAGE_EXPIRED_NOT_RETURNED", locale };
}
