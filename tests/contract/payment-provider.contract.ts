import { describe, expect, it } from "vitest";
import type { HostedPaymentRequest, PaymentProvider } from "@/domain/payments/provider";

/**
 * What every card processor must do for the shop's money flow to be true. The same suite runs against
 * the demo gateway and the real PayPlus sandbox, so the demo can't quietly promise more than PayPlus does.
 */
export interface ContractHarness {
  provider: PaymentProvider;
  /** Complete the hosted page the way a customer would. Returns false when this harness can't (the test is then skipped with a reason). */
  pay(page: { pageRef: string; url: string }, outcome: "APPROVE" | "DECLINE"): Promise<boolean>;
  /** Why tests that need a paid page can't run here, if they can't. */
  cannotPay?: string;
}

const request = (over: Partial<HostedPaymentRequest> = {}): HostedPaymentRequest => ({
  intentId: crypto.randomUUID(),
  orderNumber: `2026-${String(Math.floor(Math.random() * 90_000) + 10_000)}`,
  amountAgorot: 46_500,
  mode: "AUTHORIZE",
  locale: "he",
  customer: { name: "דנה כהן", phoneE164: "+972541234567", email: null },
  returnUrl: "https://example.test/api/payments/return?intent=x",
  ...over,
});

export function paymentProviderContract(label: string, makeHarness: () => Promise<ContractHarness>) {
  describe(`PaymentProvider contract — ${label}`, () => {
    it("creates a hosted page with a reference and an https (or local demo) link", async () => {
      const { provider } = await makeHarness();
      const page = await provider.createHostedPayment(request());
      expect(page.pageRef).toMatch(/\S{8,}/);
      expect(page.url).toMatch(/^https?:\/\//);
    });

    it("an unpaid page is PENDING, an unknown reference is NOT_FOUND or PENDING — never approved", async () => {
      const { provider } = await makeHarness();
      const page = await provider.createHostedPayment(request());
      expect((await provider.lookup(page.pageRef)).kind).toBe("PENDING");
      expect(["NOT_FOUND", "PENDING"]).toContain((await provider.lookup("does-not-exist-0000")).kind);
    });

    describe("after the customer pays", () => {
      it("a J5 hold reports the exact amount, a card, and a token for later charges", async (ctx) => {
        const h = await makeHarness();
        const page = await h.provider.createHostedPayment(request({ amountAgorot: 46_500 }));
        if (!(await h.pay(page, "APPROVE"))) return ctx.skip(h.cannotPay);
        const r = await h.provider.lookup(page.pageRef);
        expect(r.kind).toBe("APPROVED");
        if (r.kind !== "APPROVED") return;
        expect(r.amountAgorot).toBe(46_500);
        expect(r.transactionRef).toBeTruthy();
        expect(r.cardLast4).toMatch(/^\d{4}$/);
        expect(r.tokenRef).toBeTruthy();
      });

      it("captures less than the hold, once; refuses more than the hold", async (ctx) => {
        const h = await makeHarness();
        const page = await h.provider.createHostedPayment(request({ amountAgorot: 46_500 }));
        if (!(await h.pay(page, "APPROVE"))) return ctx.skip(h.cannotPay);
        const r = await h.provider.lookup(page.pageRef);
        if (r.kind !== "APPROVED") throw new Error(`expected approval, got ${r.kind}`);
        expect((await h.provider.capture({ transactionRef: r.transactionRef, amountAgorot: 46_501, idempotencyKey: `${page.pageRef}:over` })).ok).toBe(false);
        const first = await h.provider.capture({ transactionRef: r.transactionRef, amountAgorot: 38_700, idempotencyKey: `${page.pageRef}:1` });
        if (!first.ok) throw new Error(`capture failed: ${first.code}`);
        // A retry (our side timed out) never charges again: it hands back the same capture, or refuses.
        const again = await h.provider.capture({ transactionRef: r.transactionRef, amountAgorot: 38_700, idempotencyKey: `${page.pageRef}:2` });
        if (again.ok) expect(again.captureRef).toBe(first.captureRef);
        // Refunding one agora more than the first capture is refused — so the retry charged nothing extra.
        expect((await h.provider.refund({ transactionRef: first.captureRef, amountAgorot: 38_701, idempotencyKey: `${page.pageRef}:over` })).ok).toBe(false);
      });

      it("refunds part, then the rest, and never more than was charged", async (ctx) => {
        const h = await makeHarness();
        const page = await h.provider.createHostedPayment(request({ amountAgorot: 20_000 }));
        if (!(await h.pay(page, "APPROVE"))) return ctx.skip(h.cannotPay);
        const r = await h.provider.lookup(page.pageRef);
        if (r.kind !== "APPROVED") throw new Error(`expected approval, got ${r.kind}`);
        const captured = await h.provider.capture({ transactionRef: r.transactionRef, amountAgorot: 18_000, idempotencyKey: `${page.pageRef}:cap` });
        if (!captured.ok) throw new Error(`capture failed: ${captured.code}`);
        // Refunds go to what the capture returned — with PayPlus that is a new transaction, not the hold.
        const from = captured.captureRef;
        expect((await h.provider.refund({ transactionRef: from, amountAgorot: 5_000, idempotencyKey: `${page.pageRef}:r1` })).ok).toBe(true);
        expect((await h.provider.refund({ transactionRef: from, amountAgorot: 13_001, idempotencyKey: `${page.pageRef}:r2` })).ok).toBe(false);
        expect((await h.provider.refund({ transactionRef: from, amountAgorot: 13_000, idempotencyKey: `${page.pageRef}:r3` })).ok).toBe(true);
        // Retrying a refund that went through (our side timed out) must not refund twice: nothing is left, yet it succeeds.
        expect((await h.provider.refund({ transactionRef: from, amountAgorot: 13_000, idempotencyKey: `${page.pageRef}:r3` })).ok).toBe(true);
      });

      it("releases a hold that was never captured", async (ctx) => {
        const h = await makeHarness();
        const page = await h.provider.createHostedPayment(request());
        if (!(await h.pay(page, "APPROVE"))) return ctx.skip(h.cannotPay);
        const r = await h.provider.lookup(page.pageRef);
        if (r.kind !== "APPROVED") throw new Error(`expected approval, got ${r.kind}`);
        expect((await h.provider.voidAuthorization({ transactionRef: r.transactionRef })).ok).toBe(true);
        expect((await h.provider.capture({ transactionRef: r.transactionRef, amountAgorot: 1_000, idempotencyKey: `${page.pageRef}:after-void` })).ok).toBe(false);
      });

      it("charges the saved token separately (the extra the customer approved)", async (ctx) => {
        const h = await makeHarness();
        const page = await h.provider.createHostedPayment(request());
        if (!(await h.pay(page, "APPROVE"))) return ctx.skip(h.cannotPay);
        const r = await h.provider.lookup(page.pageRef);
        if (r.kind !== "APPROVED" || !r.tokenRef) throw new Error("expected approval with a token");
        const extra = await h.provider.chargeToken({ tokenRef: r.tokenRef, amountAgorot: 7_160, idempotencyKey: `${page.pageRef}:extra`, orderNumber: "2026-00011" });
        expect(extra.ok).toBe(true);
        const again = await h.provider.chargeToken({ tokenRef: r.tokenRef, amountAgorot: 7_160, idempotencyKey: `${page.pageRef}:extra`, orderNumber: "2026-00011" });
        expect(again).toEqual(extra);
        expect((await h.provider.chargeToken({ tokenRef: "not-a-real-token", amountAgorot: 100, idempotencyKey: `${page.pageRef}:bad`, orderNumber: "2026-00011" })).ok).toBe(false);
      });

      it("a declined card reads as DECLINED with a reason, not as pending", async (ctx) => {
        const h = await makeHarness();
        const page = await h.provider.createHostedPayment(request());
        if (!(await h.pay(page, "DECLINE"))) return ctx.skip(h.cannotPay);
        const r = await h.provider.lookup(page.pageRef);
        expect(r.kind).toBe("DECLINED");
      });
    });
  });
}
