import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createPayPlusProvider, declineReasonFor, PAYPLUS_BASE } from "@/infra/payments/payplus";

/**
 * These tests pin the requests we send and how we read replies, using the field names from PayPlus's
 * docs and plugins. They can't prove PayPlus answers this way — the sandbox contract suite does that.
 */

type Call = { url: string; headers: Record<string, string>; body: Record<string, unknown> };

function fakePayPlus(replies: Record<string, (body: Record<string, unknown>) => { status?: number; json: unknown }>) {
  const calls: Call[] = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body));
    calls.push({ url, headers: init.headers as Record<string, string>, body });
    const path = url.replace(PAYPLUS_BASE.sandbox, "");
    const reply = replies[path]?.(body);
    if (!reply) return new Response(JSON.stringify({ results: { status: "error", code: 1, description: "unexpected" } }), { status: 400 });
    return new Response(JSON.stringify(reply.json), { status: reply.status ?? 200 });
  }) as unknown as typeof fetch;
  const provider = createPayPlusProvider({
    apiKey: "key",
    secretKey: "secret",
    paymentPageUid: "page-uid",
    terminalUid: "terminal-uid",
    cashierUid: "cashier-uid",
    sandbox: true,
    callbackUrl: "https://shop.test/api/payments/payplus/callback",
    fetch: fetchImpl,
  });
  return { provider, calls };
}

const success = (data: unknown) => ({ json: { results: { status: "success", code: 0, description: "ok" }, data } });

describe("PayPlus provider (wire format)", () => {
  it("asks for a J5 hold page in decimal shekels, with a token, our references and the callback", async () => {
    const { provider, calls } = fakePayPlus({
      "PaymentPages/generateLink": () => success({ page_request_uid: "pr_1", payment_page_link: "https://payments.payplus.co.il/pr_1" }),
    });
    const page = await provider.createHostedPayment({
      intentId: "intent-1",
      orderNumber: "2026-00042",
      amountAgorot: 46_550,
      mode: "AUTHORIZE",
      locale: "he",
      customer: { name: "דנה כהן", phoneE164: "+972541234567", email: null },
      returnUrl: "https://shop.test/api/payments/return?intent=intent-1",
    });
    expect(page).toEqual({ pageRef: "pr_1", url: "https://payments.payplus.co.il/pr_1" });
    const [c] = calls;
    expect(c.url).toBe(`${PAYPLUS_BASE.sandbox}PaymentPages/generateLink`);
    expect(c.headers["api-key"]).toBe("key");
    expect(JSON.parse(c.headers.Authorization)).toEqual({ api_key: "key", secret_key: "secret" });
    expect(c.body).toMatchObject({
      payment_page_uid: "page-uid",
      amount: 465.5,
      currency_code: "ILS",
      charge_method: 2,
      create_token: true,
      refURL_callback: "https://shop.test/api/payments/payplus/callback",
      more_info: "intent-1",
      customer: { customer_name: "דנה כהן", phone: "0541234567" },
    });
  });

  it("uses an immediate charge (J4) for package-only orders", async () => {
    const { provider, calls } = fakePayPlus({ "PaymentPages/generateLink": () => success({ page_request_uid: "pr", payment_page_link: "https://x" }) });
    await provider.createHostedPayment({ intentId: "i", orderNumber: "n", amountAgorot: 14_900, mode: "CHARGE", locale: "en", customer: { name: "A", phoneE164: "+972541234567", email: "a@b.co" }, returnUrl: "https://r" });
    expect(calls[0].body).toMatchObject({ charge_method: 1, amount: 149, language_code: "en" });
  });

  it("reads an approved hold, a decline, and 'not paid yet'", async () => {
    let reply: unknown = null;
    const { provider } = fakePayPlus({ "PaymentPages/ipn": () => ({ json: reply }) });

    reply = { results: { status: "success", code: 0 }, data: { status_code: "000", type: "Approval", transaction_uid: "tx_1", amount: 464.75, approval_num: "0123456", four_digits: "9844", brand_name: "Mastercard", token_uid: "tok_1", customer_uid: "cus_1" } };
    expect(await provider.lookup("pr_1")).toEqual({ kind: "APPROVED", transactionRef: "tx_1", approvalNumber: "0123456", amountAgorot: 46_475, tokenRef: "tok_1|cus_1", cardBrand: "Mastercard", cardLast4: "9844" });

    reply = { results: { status: "success", code: 0 }, data: { status_code: "036", transaction_uid: "tx_2" } };
    expect(await provider.lookup("pr_2")).toEqual({ kind: "DECLINED", code: "036", reason: "EXPIRED_CARD" });

    reply = { results: { status: "error", code: 1, description: "not found" }, data: {} };
    expect(await provider.lookup("pr_3")).toEqual({ kind: "PENDING" });
  });

  it("a network failure while checking a payment is 'pending', never 'paid'", async () => {
    const provider = createPayPlusProvider({ apiKey: "k", secretKey: "s", paymentPageUid: "p", terminalUid: "t", cashierUid: "c", sandbox: true, callbackUrl: "https://x", fetch: (async () => { throw new TypeError("fetch failed"); }) as unknown as typeof fetch });
    expect(await provider.lookup("pr")).toEqual({ kind: "PENDING" });
    expect(await provider.capture({ transactionRef: "tx", amountAgorot: 100, idempotencyKey: "k" })).toEqual({ ok: false, code: "NETWORK", reason: "PROVIDER_ERROR" });
  });

  it("captures in shekels, and a retry finds the earlier capture instead of charging again", async () => {
    let captured = false;
    const { provider, calls } = fakePayPlus({
      "Transactions/View": (body) => success(captured && body.more_info === "capture:tx_1" ? [{ transaction_uid: "cap_1", status_code: "000" }] : []),
      "Transactions/ChargeByTransactionUID": () => {
        captured = true;
        return success({ transaction: { uid: "cap_1", status_code: "000", amount: 387 } });
      },
    });
    expect(await provider.capture({ transactionRef: "tx_1", amountAgorot: 38_700, idempotencyKey: "order:1:capture:1" })).toEqual({ ok: true, captureRef: "cap_1" });
    expect(calls.find((c) => c.url.endsWith("ChargeByTransactionUID"))!.body).toEqual({ transaction_uid: "tx_1", amount: 387, more_info: "capture:tx_1" });
    expect(await provider.capture({ transactionRef: "tx_1", amountAgorot: 38_700, idempotencyKey: "order:1:capture:2" })).toEqual({ ok: true, captureRef: "cap_1" });
    expect(calls.filter((c) => c.url.endsWith("ChargeByTransactionUID"))).toHaveLength(1);
  });

  it("reports a refused capture with PayPlus's code", async () => {
    const { provider } = fakePayPlus({
      "Transactions/View": () => success([]),
      "Transactions/ChargeByTransactionUID": () => ({ status: 200, json: { results: { status: "error", code: 1, description: "Amount is bigger than original transaction" }, data: { transaction: { status_code: "999" } } } }),
    });
    expect(await provider.capture({ transactionRef: "tx", amountAgorot: 50_000, idempotencyKey: "k" })).toEqual({ ok: false, code: "999", reason: "AMOUNT_EXCEEDS_HOLD" });
  });

  it("charges a saved token with its customer, and refuses a token that has none", async () => {
    const { provider, calls } = fakePayPlus({
      "Transactions/View": () => success([]),
      "Transactions/Charge": () => success({ transaction: { uid: "tx_extra", status_code: "000" } }),
    });
    expect(await provider.chargeToken({ tokenRef: "tok_1|cus_1", amountAgorot: 7_160, idempotencyKey: "order:1:extra:line", orderNumber: "2026-00011" })).toEqual({ ok: true, transactionRef: "tx_extra" });
    expect(calls.at(-1)!.body).toMatchObject({ terminal_uid: "terminal-uid", cashier_uid: "cashier-uid", amount: 71.6, use_token: true, token: "tok_1", customer_uid: "cus_1", credit_terms: 1 });
    expect(await provider.chargeToken({ tokenRef: "tok_only", amountAgorot: 100, idempotencyKey: "x", orderNumber: "n" })).toEqual({ ok: false, code: "TOKEN_WITHOUT_CUSTOMER" });
  });

  it("accepts only callbacks signed with our secret over the exact body", () => {
    const { provider } = fakePayPlus({});
    const body = JSON.stringify({ transaction: { payment_request_uid: "pr_1", status_code: "000" } });
    const hash = createHmac("sha256", "secret").update(body).digest("base64");
    expect(provider.verifyCallback(body, new Headers({ hash, "user-agent": "PayPlus" }))).toBe(true);
    expect(provider.verifyCallback(`${body} `, new Headers({ hash, "user-agent": "PayPlus" }))).toBe(false);
    expect(provider.verifyCallback(body, new Headers({ hash: createHmac("sha256", "other").update(body).digest("base64"), "user-agent": "PayPlus" }))).toBe(false);
    expect(provider.verifyCallback(body, new Headers({ hash, "user-agent": "curl" }))).toBe(false);
  });

  it("maps only well-known card network codes", () => {
    expect(declineReasonFor("001")).toBe("CARD_BLOCKED");
    expect(declineReasonFor("036")).toBe("EXPIRED_CARD");
    expect(declineReasonFor("004")).toBe("GENERIC_DECLINE");
  });
});
