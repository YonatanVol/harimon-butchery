/**
 * End-to-end check against the real PayPlus sandbox, with a person paying the hosted page.
 * Usage: npm run payplus:check  (needs the PAYPLUS_* values in .env.local, PAYPLUS_ENV=sandbox)
 *
 * It creates a ₪465 J5 hold page and prints the link. Pay it yourself with PayPlus's sandbox test card
 * (listed in their docs). The script then captures ₪387, refunds ₪50, and charges ₪1.00 on the saved token,
 * printing each raw outcome, so you can match them in the PayPlus sandbox dashboard.
 */
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { payplusConfigFromEnv } from "../src/infra/payments/factory";
import { createPayPlusProvider } from "../src/infra/payments/payplus";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const c = payplusConfigFromEnv();
if (!c.ok) {
  console.error(`Missing ${c.missing.join(", ")} in .env.local`);
  process.exit(1);
}
if (!c.config.sandbox) {
  console.error("Refusing to run against production. Set PAYPLUS_ENV=sandbox.");
  process.exit(1);
}

const provider = createPayPlusProvider(c.config);
const step = (label: string, value: unknown) => console.log(`\n▸ ${label}\n${JSON.stringify(value, null, 2)}`);

const page = await provider.createHostedPayment({
  intentId: randomUUID(),
  orderNumber: `CHECK-${Date.now()}`,
  amountAgorot: 46_500,
  mode: "AUTHORIZE",
  locale: "he",
  customer: { name: "Sandbox Check", phoneE164: "+972541234567", email: null },
  returnUrl: `${process.env.APP_URL ?? "http://localhost:3000"}/he`,
});
step("Hosted page created — open this link and pay with the sandbox test card", page);

const deadline = Date.now() + 10 * 60_000;
let result = await provider.lookup(page.pageRef);
while (result.kind === "PENDING" && Date.now() < deadline) {
  await new Promise((r) => setTimeout(r, 5_000));
  result = await provider.lookup(page.pageRef);
  process.stdout.write(".");
}
step("Lookup", result);
if (result.kind !== "APPROVED") process.exit(result.kind === "DECLINED" ? 0 : 1);

const capture = await provider.capture({ transactionRef: result.transactionRef, amountAgorot: 38_700, idempotencyKey: `check:${page.pageRef}:capture` });
step("Capture ₪387 of the ₪465 hold", capture);
if (capture.ok) {
  step("Retry the same capture (must not charge again)", await provider.capture({ transactionRef: result.transactionRef, amountAgorot: 38_700, idempotencyKey: `check:${page.pageRef}:capture:2` }));
  step("Refund ₪50", await provider.refund({ transactionRef: capture.captureRef, amountAgorot: 5_000, idempotencyKey: `check:${page.pageRef}:refund` }));
}
if (result.tokenRef) {
  step("Charge ₪1.00 on the saved token", await provider.chargeToken({ tokenRef: result.tokenRef, amountAgorot: 100, idempotencyKey: `check:${page.pageRef}:token`, orderNumber: "CHECK" }));
} else {
  step("No token returned", "Tokenization may be off for this terminal — approved extras can't be charged");
}
