import { and, eq } from "drizzle-orm";
import { availabilityOf } from "@/domain/catalog/availability";
import { type LineProblem, validateQuantity, validateWeight } from "@/domain/cart/cart";
import { db } from "../db/client";
import { cart, cartLine, product, productVariant, stockItem } from "../db/schema";

/**
 * Putting a cut in the cart. Shared by the add button, the recipe's "add the meat", and ordering a past
 * order again — so all three obey exactly the same limits, stock and step size.
 */

export async function loadProductForVariant(variantId: string) {
  const [row] = await db
    .select({ variant: productVariant, product, stock: stockItem })
    .from(productVariant)
    .innerJoin(product, eq(product.id, productVariant.productId))
    .leftJoin(stockItem, eq(stockItem.productId, product.id))
    .where(eq(productVariant.id, variantId));
  return row ?? null;
}

export type VariantRow = NonNullable<Awaited<ReturnType<typeof loadProductForVariant>>>;

export function checkAmount(row: VariantRow, amount: { requestedG: number | null; quantity: number | null }): LineProblem | null {
  const { product: p, variant, stock } = row;
  if (!p.published || !variant.published) return { key: "UNAVAILABLE" };
  const availability = availabilityOf({
    pricingMode: p.pricingMode,
    onHandG: stock?.onHandG ?? 0,
    reservedG: stock?.reservedG ?? 0,
    onHandUnits: stock?.onHandUnits ?? 0,
    reservedUnits: stock?.reservedUnits ?? 0,
    lowThresholdG: 0,
    lowThresholdUnits: 0,
    minOrderG: p.minOrderG,
    nextRestockDate: null,
  });
  if (p.pricingMode === "WEIGHT") {
    if (amount.requestedG === null) return { key: "BELOW_MIN", minG: p.minOrderG! };
    return validateWeight({
      requestedG: amount.requestedG,
      minG: p.minOrderG!,
      maxG: p.maxOrderG!,
      stepG: p.stepG!,
      availableG: availability.kind === "OUT" ? 0 : availability.availableG,
    });
  }
  if (amount.quantity === null) return { key: "QUANTITY_RANGE", max: 10 };
  return validateQuantity({
    quantity: amount.quantity,
    availableUnits: availability.kind === "OUT" ? 0 : availability.availableUnits,
  });
}

/**
 * Add one cut to an open cart, on top of what is already there. The same cut with the same note grows
 * the existing line instead of appearing twice.
 */
export async function addLine(
  cartId: string,
  input: { variantId: string; requestedG: number | null; quantity: number | null; note: string | null },
): Promise<{ ok: true } | { ok: false; problem: LineProblem }> {
  const row = await loadProductForVariant(input.variantId);
  if (!row) return { ok: false, problem: { key: "UNAVAILABLE" } };

  const trimmedNote = input.note?.trim() || null;
  const [existing] = await db
    .select()
    .from(cartLine)
    .where(and(eq(cartLine.cartId, cartId), eq(cartLine.variantId, input.variantId)));
  const sameNote = existing && (existing.customerNote ?? null) === trimmedNote;

  const amount =
    row.product.pricingMode === "WEIGHT"
      ? { requestedG: (sameNote ? (existing.requestedG ?? 0) : 0) + (input.requestedG ?? 0), quantity: null }
      : { requestedG: null, quantity: (sameNote ? (existing.quantity ?? 0) : 0) + (input.quantity ?? 0) };

  const problem = checkAmount(row, amount);
  if (problem) return { ok: false, problem };

  if (sameNote) {
    await db.update(cartLine).set(amount).where(eq(cartLine.id, existing.id));
  } else {
    await db.insert(cartLine).values({ cartId, variantId: input.variantId, ...amount, customerNote: trimmedNote });
  }
  await db.update(cart).set({ updatedAt: new Date() }).where(eq(cart.id, cartId));
  return { ok: true };
}

export async function cartLineCount(cartId: string): Promise<number> {
  const lines = await db.select({ id: cartLine.id }).from(cartLine).where(eq(cartLine.cartId, cartId));
  return lines.length;
}
