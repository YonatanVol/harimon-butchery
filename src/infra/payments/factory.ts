import "server-only";
import type { PaymentProvider } from "@/domain/payments/provider";
import { db } from "../db/client";
import { createMockProvider } from "./mock";
import { createPayPlusProvider } from "./payplus";

export function appUrl() {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/** PayPlus settings from the environment, or the list of what is missing. */
export function payplusConfigFromEnv(env = process.env) {
  const need = ["PAYPLUS_API_KEY", "PAYPLUS_SECRET_KEY", "PAYPLUS_PAYMENT_PAGE_UID", "PAYPLUS_TERMINAL_UID", "PAYPLUS_CASHIER_UID"] as const;
  const missing = need.filter((k) => !env[k]);
  if (missing.length) return { ok: false as const, missing };
  return {
    ok: true as const,
    config: {
      apiKey: env.PAYPLUS_API_KEY!,
      secretKey: env.PAYPLUS_SECRET_KEY!,
      paymentPageUid: env.PAYPLUS_PAYMENT_PAGE_UID!,
      terminalUid: env.PAYPLUS_TERMINAL_UID!,
      cashierUid: env.PAYPLUS_CASHIER_UID!,
      // Sandbox unless production is asked for by name.
      sandbox: env.PAYPLUS_ENV !== "production",
      callbackUrl: `${(env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "")}/api/payments/payplus/callback`,
    },
  };
}

/** The active card processor. Demo mode (MOCK) unless PAYMENT_PROVIDER says otherwise. */
export function paymentProvider(): PaymentProvider {
  const name = process.env.PAYMENT_PROVIDER ?? "MOCK";
  switch (name) {
    case "MOCK":
      return createMockProvider(db, appUrl());
    case "PAYPLUS": {
      const c = payplusConfigFromEnv();
      // Money must never fall back silently to a pretend gateway: a half-configured PayPlus stops here, loudly.
      if (!c.ok) throw new Error(`PAYMENT_PROVIDER=PAYPLUS but ${c.missing.join(", ")} not set. See .env.example.`);
      return createPayPlusProvider(c.config);
    }
    default:
      throw new Error(`Payment provider "${name}" is not configured. Use PAYMENT_PROVIDER=MOCK for demo mode.`);
  }
}
