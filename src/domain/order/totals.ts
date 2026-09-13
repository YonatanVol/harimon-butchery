import { type Agorot, add, agorot, ceilToShekel, MoneyError, ZERO } from "../money/agorot";
import type { Grams } from "../weight/grams";
import { priceForWeight } from "../weight/reprice";
import { toleranceBounds } from "../weight/tolerance";

/**
 * In plain words: a weight order is never charged its estimate. The card is held for the price of
 * every line at its maximum allowed weight, rounded up to the shekel. After weighing, the real
 * price is charged — and because no line may exceed its maximum weight, the real price can never
 * exceed the hold.
 */

export type PricedLine =
  | { mode: "WEIGHT"; pricePerKg: Agorot; requested: Grams; toleranceBp: number }
  | { mode: "PACKAGE"; unitPrice: Agorot; quantity: number };

export type FulfilledLine =
  | { mode: "WEIGHT"; pricePerKg: Agorot; actual: Grams | null } // null = not supplied (short)
  | { mode: "PACKAGE"; unitPrice: Agorot; quantity: number };

export function lineEstimate(line: PricedLine): Agorot {
  if (line.mode === "WEIGHT") return priceForWeight(line.pricePerKg, line.requested);
  assertQuantity(line.quantity);
  return agorot(line.unitPrice * line.quantity);
}

/** The most this line can cost once weighed. */
export function lineCeiling(line: PricedLine): Agorot {
  if (line.mode === "WEIGHT") {
    const { max } = toleranceBounds(line.requested, line.toleranceBp);
    return priceForWeight(line.pricePerKg, max);
  }
  return lineEstimate(line);
}

export interface OrderQuote {
  itemsEstimate: Agorot;
  deliveryFee: Agorot;
  estimateTotal: Agorot;
  /** Amount held on the card. Equals the exact total when the order has no weight lines. */
  authorizationCeiling: Agorot;
  hasWeightLines: boolean;
}

export function quoteOrder(lines: readonly PricedLine[], deliveryFee: Agorot = ZERO): OrderQuote {
  const itemsEstimate = add(...lines.map(lineEstimate));
  const estimateTotal = add(itemsEstimate, deliveryFee);
  const hasWeightLines = lines.some((l) => l.mode === "WEIGHT");
  const authorizationCeiling = hasWeightLines
    ? ceilToShekel(add(...lines.map(lineCeiling), deliveryFee))
    : estimateTotal;
  return { itemsEstimate, deliveryFee, estimateTotal, authorizationCeiling, hasWeightLines };
}

export function lineFinal(line: FulfilledLine): Agorot {
  if (line.mode === "WEIGHT") {
    return line.actual === null ? ZERO : priceForWeight(line.pricePerKg, line.actual);
  }
  assertQuantity(line.quantity, true);
  return agorot(line.unitPrice * line.quantity);
}

export function finalTotal(lines: readonly FulfilledLine[], deliveryFee: Agorot): Agorot {
  return add(...lines.map(lineFinal), deliveryFee);
}

function assertQuantity(quantity: number, allowZero = false) {
  if (!Number.isSafeInteger(quantity) || quantity < (allowZero ? 0 : 1)) {
    throw new MoneyError(`Invalid package quantity ${quantity}`);
  }
}
