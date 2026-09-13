import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { DeclineReason, PaymentProvider } from "@/domain/payments/provider";
import { holdSlotForCart } from "../cart/holds";
import type * as schema from "../db/schema";
import { order, paymentIntent } from "../db/schema";
import { applyOrderEvent } from "./events";

type Database = PostgresJsDatabase<typeof schema>;

/** How long we treat a card hold as valid before refusing to capture on it. Conservative; see ADR. */
export const HOLD_VALID_DAYS = 5;

export type AuthorizationOutcome =
  | { kind: "APPROVED"; orderNumber: string; accessToken: string; locale: string }
  | { kind: "DECLINED"; reason: DeclineReason | "AMOUNT_MISMATCH"; locale: string }
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
    await db.transaction(async (tx) => {
      const [locked] = await tx.select().from(paymentIntent).where(eq(paymentIntent.id, intent.id)).for("update");
      if (locked.status === "AUTHORIZED") return;
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
