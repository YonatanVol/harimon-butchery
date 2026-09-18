import { type Agorot, agorot, ZERO } from "../money/agorot";
import { type OrderQuote, type PricedLine, quoteOrder } from "../order/totals";

/**
 * Cart rules. Every rejection has a reason key the interface turns into a sentence —
 * the customer is never refused silently.
 */

export type LineProblem =
  | { key: "OUT_OF_STOCK" }
  | { key: "BELOW_MIN"; minG: number }
  | { key: "ABOVE_MAX"; maxG: number }
  | { key: "OFF_STEP"; stepG: number }
  | { key: "NOT_ENOUGH_STOCK"; availableG: number }
  | { key: "QUANTITY_RANGE"; max: number }
  | { key: "NOT_ENOUGH_UNITS"; available: number }
  | { key: "UNAVAILABLE" };

export const MAX_PACKAGES_PER_LINE = 10;

export function validateWeight(req: {
  requestedG: number;
  minG: number;
  maxG: number;
  stepG: number;
  availableG: number;
}): LineProblem | null {
  const { requestedG, minG, maxG, stepG, availableG } = req;
  if (availableG < minG) return { key: "OUT_OF_STOCK" };
  if (!Number.isSafeInteger(requestedG) || requestedG < minG) return { key: "BELOW_MIN", minG };
  if (requestedG > maxG) return { key: "ABOVE_MAX", maxG };
  if ((requestedG - minG) % stepG !== 0) return { key: "OFF_STEP", stepG };
  if (requestedG > availableG) return { key: "NOT_ENOUGH_STOCK", availableG };
  return null;
}

/**
 * The nearest weight the butcher can actually cut: rounded to the cut's step and kept inside its limits.
 * A weight that came off the scale (2,613 g) is not one the shop sells, so ordering "the same again"
 * asks for the closest amount it does.
 */
export function snapToCut(requestedG: number, limits: { minOrderG: number; maxOrderG: number; stepG: number }): number {
  const step = Math.max(1, limits.stepG);
  const rounded = Math.round(requestedG / step) * step;
  return Math.min(limits.maxOrderG, Math.max(limits.minOrderG, rounded));
}

export function validateQuantity(req: { quantity: number; availableUnits: number }): LineProblem | null {
  if (req.availableUnits < 1) return { key: "OUT_OF_STOCK" };
  if (!Number.isSafeInteger(req.quantity) || req.quantity < 1 || req.quantity > MAX_PACKAGES_PER_LINE) {
    return { key: "QUANTITY_RANGE", max: MAX_PACKAGES_PER_LINE };
  }
  if (req.quantity > req.availableUnits) return { key: "NOT_ENOUGH_UNITS", available: req.availableUnits };
  return null;
}

export interface ZoneTerms {
  deliveryFeeAgorot: number;
  freeDeliveryOverAgorot: number | null;
  minOrderAgorot: number;
}

export interface CartQuote extends OrderQuote {
  zoneKnown: boolean;
  freeDelivery: boolean;
  /** How much more (by estimate) until delivery is free; null when not applicable. */
  freeDeliveryGap: Agorot | null;
  /** How much more (by estimate) until the zone's minimum order; null when met or unknown. */
  minOrderGap: Agorot | null;
}

/**
 * Free delivery and the minimum order are judged on the items estimate at checkout — the promise
 * made then is kept even if the weighed total comes in slightly lower.
 */
export function quoteCart(lines: readonly PricedLine[], zone: ZoneTerms | null): CartQuote {
  const itemsOnly = quoteOrder(lines);
  if (!zone) {
    return { ...itemsOnly, zoneKnown: false, freeDelivery: false, freeDeliveryGap: null, minOrderGap: null };
  }
  const items = itemsOnly.itemsEstimate;
  const free = zone.freeDeliveryOverAgorot !== null && items >= zone.freeDeliveryOverAgorot;
  const fee = free ? ZERO : agorot(zone.deliveryFeeAgorot);
  const quote = quoteOrder(lines, fee);
  return {
    ...quote,
    zoneKnown: true,
    freeDelivery: free,
    freeDeliveryGap:
      zone.freeDeliveryOverAgorot !== null && !free ? agorot(zone.freeDeliveryOverAgorot - items) : null,
    minOrderGap: items < zone.minOrderAgorot ? agorot(zone.minOrderAgorot - items) : null,
  };
}
