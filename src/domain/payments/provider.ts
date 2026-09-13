/**
 * The contract every card processor implements (the built-in demo gateway, PayPlus).
 *
 * In plain words: we never see a card number. We ask the provider for a hosted payment page,
 * the customer pays there, and we get back a reference. With that reference we later charge the
 * real amount (never more than was held), refund, or release the hold.
 */

export type DeclineReason =
  | "INSUFFICIENT_FUNDS"
  | "CARD_BLOCKED"
  | "AUTHENTICATION_FAILED"
  | "EXPIRED_CARD"
  | "GENERIC_DECLINE";

export type CaptureFailure = "HOLD_EXPIRED" | "AMOUNT_EXCEEDS_HOLD" | "PROVIDER_ERROR" | "ALREADY_CAPTURED";

export interface HostedPaymentRequest {
  intentId: string;
  orderNumber: string;
  amountAgorot: number;
  /** AUTHORIZE = J5 hold (weight orders); CHARGE = immediate charge. */
  mode: "AUTHORIZE" | "CHARGE";
  locale: "he" | "en";
  customer: { name: string; phoneE164: string; email: string | null };
  /** Browser returns here. Treated as a hint only — state is re-read from the provider server-side. */
  returnUrl: string;
}

export interface HostedPaymentPage {
  pageRef: string;
  url: string;
}

export type PaymentLookup =
  | {
      kind: "APPROVED";
      transactionRef: string;
      approvalNumber: string;
      amountAgorot: number;
      tokenRef: string | null;
      cardBrand: string | null;
      cardLast4: string | null;
    }
  | { kind: "DECLINED"; code: string; reason: DeclineReason }
  | { kind: "PENDING" }
  | { kind: "NOT_FOUND" };

export type CaptureResult = { ok: true; captureRef: string } | { ok: false; code: string; reason: CaptureFailure };

export type RefundResult = { ok: true; refundRef: string } | { ok: false; code: string };

export interface PaymentProvider {
  readonly name: "MOCK" | "PAYPLUS";
  readonly sandbox: boolean;
  createHostedPayment(req: HostedPaymentRequest): Promise<HostedPaymentPage>;
  lookup(pageRef: string): Promise<PaymentLookup>;
  capture(req: { transactionRef: string; amountAgorot: number; idempotencyKey: string }): Promise<CaptureResult>;
  voidAuthorization(req: { transactionRef: string }): Promise<{ ok: boolean }>;
  refund(req: { transactionRef: string; amountAgorot: number; idempotencyKey: string }): Promise<RefundResult>;
  /** A separate immediate charge on a saved card token (e.g. extra weight the customer approved). */
  chargeToken(req: { tokenRef: string; amountAgorot: number; idempotencyKey: string; orderNumber: string }): Promise<{ ok: true; transactionRef: string } | { ok: false; code: string }>;
}
