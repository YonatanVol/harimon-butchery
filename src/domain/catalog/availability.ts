/**
 * What the storefront says about stock. Variants share their product's stock.
 * A weight product is "out" when less than its minimum order is available.
 */

export interface StockSnapshot {
  pricingMode: "WEIGHT" | "PACKAGE";
  onHandG: number;
  reservedG: number;
  onHandUnits: number;
  reservedUnits: number;
  lowThresholdG: number;
  lowThresholdUnits: number;
  minOrderG: number | null;
  nextRestockDate: string | null; // yyyy-mm-dd
}

export type Availability =
  | { kind: "IN_STOCK"; availableG: number; availableUnits: number }
  | { kind: "LOW"; availableG: number; availableUnits: number }
  | { kind: "OUT"; restockDate: string | null };

export function availabilityOf(s: StockSnapshot): Availability {
  const availableG = Math.max(0, s.onHandG - s.reservedG);
  const availableUnits = Math.max(0, s.onHandUnits - s.reservedUnits);

  if (s.pricingMode === "WEIGHT") {
    if (availableG < (s.minOrderG ?? 1)) return { kind: "OUT", restockDate: s.nextRestockDate };
    if (availableG < s.lowThresholdG) return { kind: "LOW", availableG, availableUnits };
    return { kind: "IN_STOCK", availableG, availableUnits };
  }
  if (availableUnits < 1) return { kind: "OUT", restockDate: s.nextRestockDate };
  if (availableUnits < s.lowThresholdUnits) return { kind: "LOW", availableG, availableUnits };
  return { kind: "IN_STOCK", availableG, availableUnits };
}

/** The most a customer may request right now: the product's max, capped by what is available. */
export function orderableMaxG(productMaxG: number, stepG: number, minG: number, availableG: number): number {
  const cap = Math.min(productMaxG, availableG);
  if (cap < minG) return 0;
  return minG + Math.floor((cap - minG) / stepG) * stepG;
}
