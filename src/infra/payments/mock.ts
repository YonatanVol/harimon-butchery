import { randomBytes } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type {
  CaptureResult,
  DeclineReason,
  HostedPaymentPage,
  HostedPaymentRequest,
  PaymentLookup,
  PaymentProvider,
  RefundResult,
} from "@/domain/payments/provider";
import type * as schema from "../db/schema";
import { mockPspTransaction } from "../db/schema";

type Database = PostgresJsDatabase<typeof schema>;

/** Test cards on the demo gateway page. Each drives one real branch of the money flow. */
export const MOCK_SCENARIOS = [
  { id: "APPROVE", brand: "Visa", last4: "4242" },
  { id: "APPROVE_CAPTURE_FAILS", brand: "Mastercard", last4: "0019" },
  { id: "DECLINE_INSUFFICIENT", brand: "Visa", last4: "9995" },
  { id: "DECLINE_BLOCKED", brand: "Mastercard", last4: "0069" },
  { id: "DECLINE_3DS", brand: "Visa", last4: "3220" },
] as const;
export type MockScenario = (typeof MOCK_SCENARIOS)[number]["id"];

const declineFor: Partial<Record<MockScenario, { code: string; reason: DeclineReason }>> = {
  DECLINE_INSUFFICIENT: { code: "051", reason: "INSUFFICIENT_FUNDS" },
  DECLINE_BLOCKED: { code: "043", reason: "CARD_BLOCKED" },
  DECLINE_3DS: { code: "3DS", reason: "AUTHENTICATION_FAILED" },
};

const ref = (prefix: string) => `${prefix}_${randomBytes(12).toString("base64url")}`;

export function createMockProvider(db: Database, appUrl: string): PaymentProvider {
  return {
    name: "MOCK",
    sandbox: true,

    async createHostedPayment(req: HostedPaymentRequest): Promise<HostedPaymentPage> {
      const pageRef = ref("mock");
      await db.insert(mockPspTransaction).values({
        ref: pageRef,
        mode: req.mode,
        amountAgorot: req.amountAgorot,
        returnUrl: req.returnUrl,
        orderNumber: req.orderNumber,
        locale: req.locale,
      });
      return { pageRef, url: `${appUrl}/${req.locale}/pay/demo/${pageRef}` };
    },

    async lookup(pageRef: string): Promise<PaymentLookup> {
      const [tx] = await db.select().from(mockPspTransaction).where(eq(mockPspTransaction.ref, pageRef));
      if (!tx) return { kind: "NOT_FOUND" };
      if (tx.status === "CREATED") return { kind: "PENDING" };
      if (tx.status === "DECLINED") {
        const d = declineFor[tx.scenario as MockScenario] ?? { code: tx.declineCode ?? "000", reason: "GENERIC_DECLINE" as const };
        return { kind: "DECLINED", code: d.code, reason: d.reason };
      }
      return {
        kind: "APPROVED",
        transactionRef: tx.ref,
        approvalNumber: tx.ref.slice(-7).toUpperCase(),
        amountAgorot: tx.amountAgorot,
        tokenRef: tx.tokenRef,
        cardBrand: tx.cardBrand,
        cardLast4: tx.cardLast4,
      };
    },

    async capture({ transactionRef, amountAgorot }): Promise<CaptureResult> {
      const [tx] = await db.select().from(mockPspTransaction).where(eq(mockPspTransaction.ref, transactionRef));
      if (!tx || tx.status !== "APPROVED") return { ok: false, code: "404", reason: "PROVIDER_ERROR" };
      if (tx.scenario === "APPROVE_CAPTURE_FAILS") return { ok: false, code: "J5-EXP", reason: "HOLD_EXPIRED" };
      // A hold is captured once; asking again returns that capture instead of charging twice (as PayPlus does).
      if (tx.capturedAgorot > 0) return { ok: true, captureRef: transactionRef };
      if (amountAgorot > tx.amountAgorot) return { ok: false, code: "AMT", reason: "AMOUNT_EXCEEDS_HOLD" };
      await db.update(mockPspTransaction).set({ capturedAgorot: amountAgorot }).where(eq(mockPspTransaction.ref, transactionRef));
      // Like PayPlus, refunds go to the reference the capture returns. The demo keeps one record, so it is the same.
      return { ok: true, captureRef: transactionRef };
    },

    async voidAuthorization({ transactionRef }) {
      const r = await db
        .update(mockPspTransaction)
        .set({ status: "VOIDED" })
        .where(sql`${mockPspTransaction.ref} = ${transactionRef} and ${mockPspTransaction.capturedAgorot} = 0`)
        .returning({ ref: mockPspTransaction.ref });
      return { ok: r.length === 1 };
    },

    async chargeToken({ tokenRef, amountAgorot, orderNumber }) {
      const [original] = await db.select().from(mockPspTransaction).where(eq(mockPspTransaction.tokenRef, tokenRef));
      if (!original) return { ok: false as const, code: "TOKEN" };
      if (original.scenario === "APPROVE_CAPTURE_FAILS") return { ok: false as const, code: "J4-DECLINED" };
      const txRef = ref("mock");
      await db.insert(mockPspTransaction).values({
        ref: txRef,
        mode: "CHARGE",
        amountAgorot,
        status: "APPROVED",
        scenario: "TOKEN_CHARGE",
        capturedAgorot: amountAgorot,
        cardBrand: original.cardBrand,
        cardLast4: original.cardLast4,
        returnUrl: original.returnUrl,
        orderNumber,
        locale: original.locale,
        decidedAt: new Date(),
      });
      return { ok: true as const, transactionRef: txRef };
    },

    async refund({ transactionRef, amountAgorot }): Promise<RefundResult> {
      const r = await db
        .update(mockPspTransaction)
        .set({ refundedAgorot: sql`${mockPspTransaction.refundedAgorot} + ${amountAgorot}` })
        .where(
          sql`${mockPspTransaction.ref} = ${transactionRef} and ${mockPspTransaction.refundedAgorot} + ${amountAgorot} <= ${mockPspTransaction.capturedAgorot}`,
        )
        .returning({ ref: mockPspTransaction.ref });
      return r.length === 1 ? { ok: true, refundRef: ref("ref") } : { ok: false, code: "OVER" };
    },
  };
}

/** What the demo gateway page does when the customer picks a test card. */
export async function decideMockPayment(db: Database, pageRef: string, scenario: MockScenario) {
  const card = MOCK_SCENARIOS.find((s) => s.id === scenario);
  if (!card) return null;
  const decline = declineFor[scenario];
  const [tx] = await db
    .update(mockPspTransaction)
    .set({
      // An immediate charge (package-only orders) is captured at approval; a J5 hold is not.
      capturedAgorot: decline ? 0 : sql`case when ${mockPspTransaction.mode} = 'CHARGE' then ${mockPspTransaction.amountAgorot} else 0 end`,
      status: decline ? "DECLINED" : "APPROVED",
      scenario,
      cardBrand: card.brand,
      cardLast4: card.last4,
      declineCode: decline?.code ?? null,
      tokenRef: decline ? null : ref("tok"),
      decidedAt: new Date(),
    })
    .where(sql`${mockPspTransaction.ref} = ${pageRef} and ${mockPspTransaction.status} = 'CREATED'`)
    .returning();
  return tx ?? null;
}
