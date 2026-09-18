"use server";

import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import type { CheckoutDetails } from "@/domain/checkout/details";
import { getOrCreateCart, findOpenCart } from "../cart/repository";
import { ensureCartToken } from "../cart/session";
import { currentCustomerPhone } from "../customer/session";
import { readCartToken } from "../cart/session";
import { db } from "../db/client";
import { mockPspTransaction } from "../db/schema";
import { decideMockPayment, MOCK_SCENARIOS, type MockScenario } from "../payments/mock";
import { appUrl, paymentProvider } from "../payments/factory";
import { type PlaceOrderResult, placeOrder } from "./placeOrder";
import { type ReorderResult, reorderInto } from "./reorder";

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
  giftRecipient: z.string().default(""),
  giftMessage: z.string().default(""),
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

/** "Order this again" — the same cuts, in the amounts that arrived, at today's prices. */
export async function reorder(input: { orderNumber: string; accessToken?: string; locale: string }): Promise<ReorderResult> {
  const orderNumber = String(input.orderNumber ?? "").slice(0, 20);
  if (!/^\d{4}-\d{5}$/.test(orderNumber)) return { ok: false, problem: { key: "NOT_FOUND" } };

  const phone = await currentCustomerPhone();
  const accessToken = typeof input.accessToken === "string" && /^[A-Za-z0-9_-]{16,64}$/.test(input.accessToken) ? input.accessToken : null;
  if (!phone && !accessToken) return { ok: false, problem: { key: "NOT_FOUND" } };

  const token = await ensureCartToken();
  const cart = await getOrCreateCart(token, input.locale === "en" ? "en" : "he");
  const result = await reorderInto(cart.id, { orderNumber, phoneE164: phone, accessToken });
  if (result.ok) refresh();
  return result;
}
