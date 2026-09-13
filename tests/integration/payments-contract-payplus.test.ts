import { describe, it } from "vitest";
import { payplusConfigFromEnv } from "@/infra/payments/factory";
import { createPayPlusProvider } from "@/infra/payments/payplus";
import { paymentProviderContract } from "../contract/payment-provider.contract";

const c = payplusConfigFromEnv();

if (!c.ok) {
  // Loud on purpose: a green run without PayPlus keys proves nothing about PayPlus.
  process.stderr.write(`\n⚠️  PayPlus sandbox contract NOT RUN — missing ${c.missing.join(", ")} in .env.local.\n\n`);
  describe("PaymentProvider contract — PayPlus sandbox", () => {
    it.skip(`not run: missing ${c.missing.join(", ")}`, () => {});
  });
} else if (!c.config.sandbox) {
  describe("PaymentProvider contract — PayPlus", () => {
    it.skip("refusing to run against PAYPLUS_ENV=production", () => {});
  });
} else {
  paymentProviderContract("PayPlus sandbox", async () => ({
    provider: createPayPlusProvider(c.config),
    // Paying means typing PayPlus's test card on their hosted page — a person does that, via `npm run payplus:check`.
    pay: async () => false,
    cannotPay: "needs a person to pay the sandbox page with PayPlus's test card — run `npm run payplus:check`",
  }));
}
