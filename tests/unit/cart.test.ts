import { describe, expect, it } from "vitest";
import { quoteCart, validateQuantity, validateWeight } from "@/domain/cart/cart";
import { agorot } from "@/domain/money/agorot";
import type { PricedLine } from "@/domain/order/totals";
import { grams } from "@/domain/weight/grams";

const rules = { minG: 250, maxG: 5000, stepG: 250, availableG: 40_000 };

describe("validateWeight", () => {
  it("accepts a valid request", () => {
    expect(validateWeight({ ...rules, requestedG: 2500 })).toBeNull();
  });

  it.each([
    [{ requestedG: 200 }, { key: "BELOW_MIN", minG: 250 }],
    [{ requestedG: 5250 }, { key: "ABOVE_MAX", maxG: 5000 }],
    [{ requestedG: 2600 }, { key: "OFF_STEP", stepG: 250 }],
    [{ requestedG: 2500, availableG: 2000 }, { key: "NOT_ENOUGH_STOCK", availableG: 2000 }],
    [{ requestedG: 250, availableG: 100 }, { key: "OUT_OF_STOCK" }],
    [{ requestedG: 1.5 }, { key: "BELOW_MIN", minG: 250 }],
  ])("%j → %j", (override, expected) => {
    expect(validateWeight({ ...rules, ...override })).toEqual(expected);
  });

  it("steps are counted from the minimum (whole chickens of 1.8 kg)", () => {
    const chicken = { minG: 1800, maxG: 9000, stepG: 1800, availableG: 40_000 };
    expect(validateWeight({ ...chicken, requestedG: 3600 })).toBeNull();
    expect(validateWeight({ ...chicken, requestedG: 3000 })).toEqual({ key: "OFF_STEP", stepG: 1800 });
  });
});

describe("validateQuantity", () => {
  it("enforces 1–10 and available units", () => {
    expect(validateQuantity({ quantity: 2, availableUnits: 30 })).toBeNull();
    expect(validateQuantity({ quantity: 0, availableUnits: 30 })).toEqual({ key: "QUANTITY_RANGE", max: 10 });
    expect(validateQuantity({ quantity: 11, availableUnits: 30 })).toEqual({ key: "QUANTITY_RANGE", max: 10 });
    expect(validateQuantity({ quantity: 3, availableUnits: 2 })).toEqual({ key: "NOT_ENOUGH_UNITS", available: 2 });
    expect(validateQuantity({ quantity: 1, availableUnits: 0 })).toEqual({ key: "OUT_OF_STOCK" });
  });
});

describe("quoteCart", () => {
  const entrecote: PricedLine = { mode: "WEIGHT", pricePerKg: agorot(17900), requested: grams(1000), toleranceBp: 1000 };
  const telAviv = { deliveryFeeAgorot: 2500, freeDeliveryOverAgorot: 35000, minOrderAgorot: 18000 };

  it("without a zone, shows items only and no gaps", () => {
    expect(quoteCart([entrecote], null)).toMatchObject({
      zoneKnown: false,
      itemsEstimate: 17900,
      deliveryFee: 0,
      estimateTotal: 17900,
      minOrderGap: null,
    });
  });

  it("under the minimum: names the gap and charges delivery", () => {
    const q = quoteCart([{ ...entrecote, requested: grams(750) }], telAviv); // 134.25 ₪
    expect(q.minOrderGap).toBe(18000 - 13425);
    expect(q.deliveryFee).toBe(2500);
    expect(q.freeDeliveryGap).toBe(35000 - 13425);
    expect(q.estimateTotal).toBe(13425 + 2500);
  });

  it("over the free-delivery threshold: no fee, no gaps, hold still covers weight", () => {
    const q = quoteCart([{ ...entrecote, requested: grams(2500) }], telAviv); // 447.50 ₪
    expect(q).toMatchObject({ freeDelivery: true, deliveryFee: 0, freeDeliveryGap: null, minOrderGap: null });
    expect(q.authorizationCeiling).toBe(49300); // 2750 g × 179 = 492.25 → 493
  });

  it("a zone with no free-delivery offer never shows a free-delivery gap", () => {
    const q = quoteCart([entrecote], { deliveryFeeAgorot: 9000, freeDeliveryOverAgorot: null, minOrderAgorot: 50000 });
    expect(q.freeDeliveryGap).toBeNull();
    expect(q.deliveryFee).toBe(9000);
  });
});
