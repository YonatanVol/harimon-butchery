import { createHmac, timingSafeEqual } from "node:crypto";
import { agorot } from "@/domain/money/agorot";
import { fromDecimalShekels, toDecimalShekels } from "@/domain/money/wire";
import type {
  CaptureResult,
  DeclineReason,
  HostedPaymentPage,
  HostedPaymentRequest,
  PaymentLookup,
  PaymentProvider,
  RefundResult,
} from "@/domain/payments/provider";

/**
 * PayPlus REST API v1.0 (https://docs.payplus.co.il). Card details are typed only on PayPlus's hosted page;
 * we hold page and transaction UIDs and a card token.
 *
 * Verified against the docs and PayPlus's own WooCommerce plugin: endpoints, `charge_method` 2 = J5 hold,
 * amounts in decimal shekels, capture ≤ hold via ChargeByTransactionUID, partial refunds, callback hash.
 * Not confirmed by any source (see docs/adr/0003-payplus.md): the flat response of PaymentPages/ipn,
 * whether Transactions/Cancel releases a J5 hold, and `customer_uid` in the ipn response.
 */

export interface PayPlusConfig {
  apiKey: string;
  secretKey: string;
  paymentPageUid: string;
  terminalUid: string;
  cashierUid: string;
  sandbox: boolean;
  /** Where PayPlus posts payment results (server to server). */
  callbackUrl: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
}

export const PAYPLUS_BASE = {
  sandbox: "https://restapidev.payplus.co.il/api/v1.0/",
  production: "https://restapi.payplus.co.il/api/v1.0/",
} as const;

type Json = Record<string, unknown>;
type Envelope = { results?: { status?: string; code?: number | string; description?: string }; data?: unknown };

const APPROVED = "000";
const str = (v: unknown) => (typeof v === "string" ? v : typeof v === "number" ? String(v) : null);

/** Tokens need the PayPlus customer they belong to; both travel together in our opaque token reference. */
const packToken = (token: string, customerUid: string | null) => (customerUid ? `${token}|${customerUid}` : token);
const unpackToken = (ref: string) => {
  const [token, customerUid] = ref.split("|");
  return { token, customerUid: customerUid ?? null };
};

/**
 * Israeli card-network (SHVA) response codes as PayPlus passes them through. Only codes whose meaning is
 * standard are mapped; everything else is a generic decline with the raw code kept for the staff screen.
 */
export function declineReasonFor(code: string): DeclineReason {
  if (["001", "002", "043"].includes(code)) return "CARD_BLOCKED";
  if (code === "036") return "EXPIRED_CARD";
  if (["3DS", "060"].includes(code)) return "AUTHENTICATION_FAILED";
  return "GENERIC_DECLINE";
}

export function createPayPlusProvider(config: PayPlusConfig): PaymentProvider & { verifyCallback(rawBody: string, headers: Headers): boolean } {
  const base = config.sandbox ? PAYPLUS_BASE.sandbox : PAYPLUS_BASE.production;
  const doFetch = config.fetch ?? fetch;

  async function call(path: string, body: Json): Promise<{ ok: boolean; status: number; envelope: Envelope }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.timeoutMs ?? 20_000);
    try {
      const res = await doFetch(`${base}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // The docs show api-key/secret-key headers; PayPlus's own plugins send this Authorization JSON. Both are sent.
          "api-key": config.apiKey,
          "secret-key": config.secretKey,
          Authorization: JSON.stringify({ api_key: config.apiKey, secret_key: config.secretKey }),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const envelope = ((await res.json().catch(() => ({}))) ?? {}) as Envelope;
      return { ok: res.ok && envelope.results?.status === "success", status: res.status, envelope };
    } finally {
      clearTimeout(timer);
    }
  }

  /** ChargeByTransactionUID / RefundByTransactionUID / Charge all answer with data.transaction. */
  const transactionOf = (envelope: Envelope) => ((envelope.data as Json | undefined)?.transaction ?? {}) as Json;
  const failureCode = (r: { status: number; envelope: Envelope }) =>
    str(transactionOf(r.envelope).status_code) ?? str(r.envelope.results?.code) ?? `HTTP${r.status}`;

  /** Before repeating a money call, see whether an earlier attempt with the same key already went through. */
  async function alreadyDone(idempotencyKey: string): Promise<string | null> {
    const r = await call("Transactions/View", { more_info: idempotencyKey }).catch(() => null);
    const rows = r?.ok && Array.isArray(r.envelope.data) ? (r.envelope.data as Json[]) : [];
    const done = rows.find((row) => str(row.status_code) === APPROVED);
    return done ? str(done.transaction_uid) : null;
  }

  return {
    name: "PAYPLUS",
    sandbox: config.sandbox,

    async createHostedPayment(req: HostedPaymentRequest): Promise<HostedPaymentPage> {
      const r = await call("PaymentPages/generateLink", {
        payment_page_uid: config.paymentPageUid,
        amount: Number(toDecimalShekels(agorot(req.amountAgorot))),
        currency_code: "ILS",
        // 2 = J5 approval (hold, captured later by weight); 1 = J4 immediate charge.
        charge_method: req.mode === "AUTHORIZE" ? 2 : 1,
        create_token: true,
        language_code: req.locale,
        sendEmailApproval: false,
        sendEmailFailure: false,
        refURL_success: req.returnUrl,
        refURL_failure: req.returnUrl,
        refURL_cancel: req.returnUrl,
        refURL_callback: config.callbackUrl,
        send_failure_callback: true,
        // Shorter than the 25 minutes after which an unpaid checkout is expired, so a page can't be paid after that.
        expiry_datetime: 20,
        customer: { customer_name: req.customer.name, email: req.customer.email ?? "", phone: req.customer.phoneE164.replace(/^\+972/, "0") },
        more_info: req.intentId,
        more_info_2: req.orderNumber,
      });
      const data = (r.envelope.data ?? {}) as Json;
      const pageRef = str(data.page_request_uid);
      const url = str(data.payment_page_link);
      if (!r.ok || !pageRef || !url) throw new Error(`PayPlus generateLink failed: ${r.envelope.results?.description ?? `HTTP ${r.status}`}`);
      return { pageRef, url };
    },

    async lookup(pageRef: string): Promise<PaymentLookup> {
      const r = await call("PaymentPages/ipn", { payment_request_uid: pageRef }).catch(() => null);
      if (!r) return { kind: "PENDING" };
      const data = (r.envelope.data ?? null) as Json | null;
      const code = data ? str(data.status_code) : null;
      // No transaction yet: the customer hasn't finished (or the reference is unknown). Never treated as paid.
      if (!r.ok || !data || !code) return { kind: "PENDING" };
      if (code !== APPROVED) return { kind: "DECLINED", code, reason: declineReasonFor(code) };
      const transactionRef = str(data.transaction_uid);
      const amount = data.amount;
      if (!transactionRef || (typeof amount !== "number" && typeof amount !== "string")) return { kind: "PENDING" };
      const token = str(data.token_uid);
      return {
        kind: "APPROVED",
        transactionRef,
        approvalNumber: str(data.approval_num) ?? "",
        amountAgorot: fromDecimalShekels(amount),
        tokenRef: token ? packToken(token, str(data.customer_uid)) : null,
        cardBrand: str(data.brand_name),
        cardLast4: str(data.four_digits),
      };
    },

    async capture({ transactionRef, amountAgorot }): Promise<CaptureResult> {
      // A hold is captured once. The marker is per hold, not per attempt: if an earlier attempt went through
      // and only our side timed out, the retry finds it instead of charging the card a second time.
      const marker = `capture:${transactionRef}`;
      const earlier = await alreadyDone(marker);
      if (earlier) return { ok: true, captureRef: earlier };
      const r = await call("Transactions/ChargeByTransactionUID", {
        transaction_uid: transactionRef,
        amount: Number(toDecimalShekels(agorot(amountAgorot))),
        more_info: marker,
      }).catch(() => null);
      if (!r) return { ok: false, code: "NETWORK", reason: "PROVIDER_ERROR" };
      const tx = transactionOf(r.envelope);
      const uid = str(tx.uid);
      if (r.ok && str(tx.status_code) === APPROVED && uid) return { ok: true, captureRef: uid };
      const code = failureCode(r);
      const description = (r.envelope.results?.description ?? "").toLowerCase();
      return { ok: false, code, reason: description.includes("amount") ? "AMOUNT_EXCEEDS_HOLD" : description.includes("expire") ? "HOLD_EXPIRED" : "PROVIDER_ERROR" };
    },

    async voidAuthorization({ transactionRef }) {
      // Same-day only per the docs; whether it releases a J5 hold on the cardholder's card is unconfirmed.
      const r = await call("Transactions/Cancel", { terminal_uid: config.terminalUid, cashier_uid: config.cashierUid, transaction_uid: transactionRef }).catch(() => null);
      return { ok: Boolean(r?.ok) };
    },

    async refund({ transactionRef, amountAgorot, idempotencyKey }): Promise<RefundResult> {
      const earlier = await alreadyDone(idempotencyKey);
      if (earlier) return { ok: true, refundRef: earlier };
      const r = await call("Transactions/RefundByTransactionUID", {
        transaction_uid: transactionRef,
        amount: Number(toDecimalShekels(agorot(amountAgorot))),
        more_info: idempotencyKey,
      }).catch(() => null);
      if (!r) return { ok: false, code: "NETWORK" };
      const tx = transactionOf(r.envelope);
      const uid = str(tx.uid);
      return r.ok && str(tx.status_code) === APPROVED && uid ? { ok: true, refundRef: uid } : { ok: false, code: failureCode(r) };
    },

    async chargeToken({ tokenRef, amountAgorot, idempotencyKey, orderNumber }) {
      const { token, customerUid } = unpackToken(tokenRef);
      if (!token || !customerUid) return { ok: false as const, code: "TOKEN_WITHOUT_CUSTOMER" };
      const earlier = await alreadyDone(idempotencyKey);
      if (earlier) return { ok: true as const, transactionRef: earlier };
      const r = await call("Transactions/Charge", {
        terminal_uid: config.terminalUid,
        cashier_uid: config.cashierUid,
        amount: Number(toDecimalShekels(agorot(amountAgorot))),
        currency_code: "ILS",
        credit_terms: 1,
        use_token: true,
        token,
        customer_uid: customerUid,
        more_info: idempotencyKey,
        more_info_1: orderNumber,
      }).catch(() => null);
      if (!r) return { ok: false as const, code: "NETWORK" };
      const tx = transactionOf(r.envelope);
      const uid = str(tx.uid);
      return r.ok && str(tx.status_code) === APPROVED && uid ? { ok: true as const, transactionRef: uid } : { ok: false as const, code: failureCode(r) };
    },

    /** PayPlus signs callbacks: header `hash` = base64(HMAC-SHA256(raw body, secret key)), with `user-agent: PayPlus`. */
    verifyCallback(rawBody: string, headers: Headers) {
      const given = headers.get("hash");
      if (!given || headers.get("user-agent") !== "PayPlus") return false;
      const expected = createHmac("sha256", config.secretKey).update(rawBody, "utf8").digest("base64");
      const a = Buffer.from(given);
      const b = Buffer.from(expected);
      return a.length === b.length && timingSafeEqual(a, b);
    },
  };
}
