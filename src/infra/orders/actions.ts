"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import type { CheckoutDetails } from "@/domain/checkout/details";
import { findOpenCart } from "../cart/repository";
import { readCartToken } from "../cart/session";
import { db } from "../db/client";
import { mockPspTransaction } from "../db/schema";
import { decideMockPayment, MOCK_SCENARIOS, type MockScenario } from "../payments/mock";
import { appUrl, paymentProvider } from "../payments/factory";
import { type PlaceOrderResult, placeOrder } from "./placeOrder";

const detailsSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string(),
  email: z.string(),
  street: z.string(),
  houseNumber: z.string(),
  entrance: z.string(),
  floor: z.string(),
  apartment: z.string(),
  intercom: z.string(),
  deliveryNotes: z.string(),
});

export async function submitCheckout(details: CheckoutDetails, locale: "he" | "en"): Promise<PlaceOrderResult> {
  const parsed = detailsSchema.safeParse(details);
  if (!parsed.success) return { ok: false, problem: { key: "DETAILS_INVALID", errors: {} } };
  const token = await readCartToken();
  const current = token ? await findOpenCart(token) : null;
  if (!current) return { ok: false, problem: { key: "CART_NOT_FOUND" } };
  return placeOrder(db, paymentProvider(), {
    cartId: current.id,
    details: parsed.data,
    locale: locale === "en" ? "en" : "he",
    appUrl: appUrl(),
  });
}

/** The demo gateway's "pay" buttons. Returns where the browser should go next. */
export async function decideDemoPayment(pageRef: string, scenario: MockScenario | "CANCEL"): Promise<{ returnUrl: string } | null> {
  if ((process.env.PAYMENT_PROVIDER ?? "MOCK") !== "MOCK") return null;
  if (!/^mock_[A-Za-z0-9_-]{8,40}$/.test(pageRef)) return null;
  if (scenario !== "CANCEL" && MOCK_SCENARIOS.some((s) => s.id === scenario)) {
    await decideMockPayment(db, pageRef, scenario);
  }
  // Already decided (e.g. a double click) or cancelled: go back and let the server read the real state.
  const [tx] = await db.select().from(mockPspTransaction).where(eq(mockPspTransaction.ref, pageRef));
  return tx ? { returnUrl: tx.returnUrl } : null;
}
