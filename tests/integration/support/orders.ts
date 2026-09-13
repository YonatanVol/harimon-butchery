import { eq } from "drizzle-orm";
import type { PaymentProvider } from "@/domain/payments/provider";
import { holdSlotForCart } from "@/infra/cart/holds";
import { cartLine, order, orderLine, paymentIntent, product } from "@/infra/db/schema";
import { resolveAuthorization } from "@/infra/orders/authorization";
import { placeOrder } from "@/infra/orders/placeOrder";
import { decideMockPayment, type MockScenario } from "@/infra/payments/mock";
import { makeCart, makeSlot, makeWeightProduct, makeZone, type TestDb, validDetails } from "./db";

export const APP = "http://test.local";

/** An authorized order: entrecôte 2.5 kg @ ₪169 (hold ₪465), with a cheaper same-category cut available. */
export async function authorizedOrder(db: TestDb, provider: PaymentProvider, scenario: MockScenario = "APPROVE", slotStartsInHours = 48) {
  const zone = await makeZone(db, { minOrderAgorot: 0, freeDeliveryOverAgorot: 35_000 });
  const startsAt = new Date(Date.now() + slotStartsInHours * 3_600_000);
  const slot = await makeSlot(db, zone.id, { startsAt, endsAt: new Date(startsAt.getTime() + 3 * 3_600_000), cutoffAt: new Date(startsAt.getTime() - 3_600_000) });
  const beef = await makeWeightProduct(db, { slug: `entrecote-${Math.random().toString(36).slice(2, 6)}`, pricePerKgAgorot: 16_900 });
  const cheaper = await makeWeightProduct(db, { slug: `shayetel-${Math.random().toString(36).slice(2, 6)}`, pricePerKgAgorot: 13_900 });
  await db.update(product).set({ categoryId: beef.product.categoryId }).where(eq(product.id, cheaper.product.id));
  const c = await makeCart(db, zone.id);
  await db.insert(cartLine).values({ cartId: c.id, variantId: beef.variant.id, requestedG: 2500 });
  const held = await holdSlotForCart(db, { cartId: c.id, zoneId: zone.id, slotId: slot.id });
  if (!held.ok) throw new Error(`hold: ${held.problem.key}`);
  const placed = await placeOrder(db, provider, { cartId: c.id, details: validDetails, locale: "he", appUrl: APP });
  if (!placed.ok) throw new Error(placed.problem.key);
  const [intent] = await db.select().from(paymentIntent).where(eq(paymentIntent.orderId, placed.orderId));
  await decideMockPayment(db, intent.hostedPageRef!, scenario);
  await resolveAuthorization(db, provider, { intentId: intent.id, appUrl: APP });
  const [line] = await db.select().from(orderLine).where(eq(orderLine.orderId, placed.orderId));
  const [o] = await db.select().from(order).where(eq(order.id, placed.orderId));
  return { orderId: placed.orderId, order: o, line, beef, cheaper, zone, slot };
}

export const versionOf = async (db: TestDb, orderId: string) => (await db.select().from(order).where(eq(order.id, orderId)))[0].version;
