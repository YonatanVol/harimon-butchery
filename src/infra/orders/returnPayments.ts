import { and, eq, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { PaymentProvider } from "@/domain/payments/provider";
import type * as schema from "../db/schema";
import { paymentIntent, paymentRefund } from "../db/schema";

type Database = PostgresJsDatabase<typeof schema>;
type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

export type ReturnedPayments =
  | { ok: true; refundedAgorot: number; holdReleased: boolean; holdLeftToLapse: boolean }
  | { ok: false; refundedAgorot: number; failedCode: string };

/**
 * Gives back everything an order took from the card when it is cancelled, by what each payment really is:
 * a J5 hold is released, an immediate charge (package-only orders) is refunded, an approved extra is refunded.
 *
 * Run it inside the transaction that holds the order row lock, before the cancel event. Every provider call
 * has a stable key, and every outcome is recorded as it happens, so a retry after a failure repeats nothing.
 * A refund that fails stops here and the order is not cancelled; a hold that can't be released (PayPlus only
 * releases same-day) is left to lapse, which costs the customer nothing.
 */
export async function returnPayments(tx: Tx, provider: PaymentProvider, input: { orderId: string; reasonKey: string; staffId: string | null }): Promise<ReturnedPayments> {
  const intents = await tx
    .select()
    .from(paymentIntent)
    .where(and(eq(paymentIntent.orderId, input.orderId), eq(paymentIntent.status, "AUTHORIZED")))
    .for("update");

  let refundedAgorot = 0;
  let holdReleased = false;
  let holdLeftToLapse = false;

  for (const intent of intents) {
    if (!intent.providerTransactionRef) continue;

    if (intent.purpose === "AUTHORIZE") {
      const voided = await provider.voidAuthorization({ transactionRef: intent.providerTransactionRef });
      if (voided.ok) {
        await tx.update(paymentIntent).set({ status: "VOIDED" }).where(eq(paymentIntent.id, intent.id));
        holdReleased = true;
      } else {
        holdLeftToLapse = true;
      }
      continue;
    }

    // CHARGE (paid in full at checkout) and EXTRA (approved extra weight): money moved, so it comes back.
    const [{ already }] = await tx
      .select({ already: sql<number>`coalesce(sum(${paymentRefund.amountAgorot}) filter (where ${paymentRefund.status} = 'SUCCEEDED'), 0)::int` })
      .from(paymentRefund)
      .where(eq(paymentRefund.paymentIntentId, intent.id));
    const remaining = intent.amountAgorot - already;
    if (remaining > 0) {
      const idempotencyKey = `order:${input.orderId}:cancel:${intent.id}`;
      const r = await provider.refund({ transactionRef: intent.providerTransactionRef, amountAgorot: remaining, idempotencyKey });
      await tx
        .insert(paymentRefund)
        .values({ paymentIntentId: intent.id, amountAgorot: remaining, reasonKey: input.reasonKey.slice(0, 200), requestedByStaffId: input.staffId, status: r.ok ? "SUCCEEDED" : "FAILED", idempotencyKey, providerRefundRef: r.ok ? r.refundRef : null })
        .onConflictDoUpdate({ target: paymentRefund.idempotencyKey, set: { status: r.ok ? "SUCCEEDED" : "FAILED", providerRefundRef: r.ok ? r.refundRef : null } });
      if (!r.ok) return { ok: false, refundedAgorot, failedCode: r.code };
      refundedAgorot += remaining;
    }
    await tx.update(paymentIntent).set({ status: "VOIDED" }).where(eq(paymentIntent.id, intent.id));
  }

  return { ok: true, refundedAgorot, holdReleased, holdLeftToLapse };
}
