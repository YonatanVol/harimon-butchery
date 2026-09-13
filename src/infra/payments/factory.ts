import "server-only";
import type { PaymentProvider } from "@/domain/payments/provider";
import { db } from "../db/client";
import { createMockProvider } from "./mock";

export function appUrl() {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/** The active card processor. Demo mode (MOCK) unless PAYMENT_PROVIDER says otherwise. */
export function paymentProvider(): PaymentProvider {
  const name = process.env.PAYMENT_PROVIDER ?? "MOCK";
  switch (name) {
    case "MOCK":
      return createMockProvider(db, appUrl());
    default:
      throw new Error(`Payment provider "${name}" is not configured. Use PAYMENT_PROVIDER=MOCK for demo mode.`);
  }
}
