import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { agorot } from "@/domain/money/agorot";
import {
  type FulfilledLine,
  finalTotal,
  lineCeiling,
  lineEstimate,
  type PricedLine,
  quoteOrder,
} from "@/domain/order/totals";
import { grams } from "@/domain/weight/grams";
import { toleranceBounds } from "@/domain/weight/tolerance";

const entrecote: PricedLine = {
  mode: "WEIGHT",
  pricePerKg: agorot(16900),
  requested: grams(2500),
  toleranceBp: 1000,
};
const familyChicken: PricedLine = { mode: "PACKAGE", unitPrice: agorot(14900), quantity: 1 };

describe("order quote", () => {
  it("matches the storefront promise: 2.5 kg entrecôte → estimate ₪422.50, hold ₪465", () => {
    expect(lineEstimate(entrecote)).toBe(42250);
    expect(lineCeiling(entrecote)).toBe(46475);
    expect(quoteOrder([entrecote])).toEqual({
      itemsEstimate: 42250,
      deliveryFee: 0,
      estimateTotal: 42250,
      authorizationCeiling: 46500,
      hasWeightLines: true,
    });
  });

  it("holds the exact total when there are only packages", () => {
    const q = quoteOrder([familyChicken], agorot(2500));
    expect(q.estimateTotal).toBe(17400);
    expect(q.authorizationCeiling).toBe(17400);
    expect(q.hasWeightLines).toBe(false);
  });

  it("includes packages and delivery in a mixed hold", () => {
    const q = quoteOrder([entrecote, { ...familyChicken, quantity: 2 }], agorot(2500));
    expect(q.estimateTotal).toBe(42250 + 29800 + 2500);
    expect(q.authorizationCeiling).toBe(46475 + 29800 + 2500 + 25); // rounded up to ₪788
  });

  it("an empty order costs nothing", () => {
    expect(quoteOrder([]).authorizationCeiling).toBe(0);
  });

  it("rejects invalid package quantities", () => {
    expect(() => lineEstimate({ ...familyChicken, quantity: 0 })).toThrow();
    expect(() => lineEstimate({ ...familyChicken, quantity: 1.5 })).toThrow();
  });

  it("charges nothing for a line that was not supplied", () => {
    const final = finalTotal([{ mode: "WEIGHT", pricePerKg: agorot(16900), actual: null }], agorot(0));
    expect(final).toBe(0);
  });
});

describe("the money invariant", () => {
  const weightLine = fc.record({
    mode: fc.constant("WEIGHT" as const),
    pricePerKg: fc.integer({ min: 1, max: 100_000 }).map(agorot),
    requested: fc.integer({ min: 1, max: 30_000 }).map(grams),
    toleranceBp: fc.integer({ min: 0, max: 5000 }),
  });
  const packageLine = fc.record({
    mode: fc.constant("PACKAGE" as const),
    unitPrice: fc.integer({ min: 1, max: 200_000 }).map(agorot),
    quantity: fc.integer({ min: 1, max: 20 }),
  });
  const line = fc.oneof(weightLine, packageLine);

  it("for any order and any weights within tolerance, the final charge never exceeds the hold", () => {
    fc.assert(
      fc.property(
        fc.array(line, { minLength: 1, maxLength: 12 }),
        fc.integer({ min: 0, max: 10_000 }).map(agorot),
        fc.infiniteStream(fc.double({ min: 0, max: 1, noNaN: true })),
        (lines, fee, ratios) => {
          const quote = quoteOrder(lines, fee);
          const fulfilled: FulfilledLine[] = lines.map((l) => {
            if (l.mode === "PACKAGE") return l;
            const { min, max } = toleranceBounds(l.requested, l.toleranceBp);
            const r = ratios.next().value as number;
            if (r < 0.05) return { mode: "WEIGHT", pricePerKg: l.pricePerKg, actual: null };
            const actual = grams(min + Math.floor((max - min) * r));
            return { mode: "WEIGHT", pricePerKg: l.pricePerKg, actual };
          });
          const final = finalTotal(fulfilled, fee);
          expect(final).toBeLessThanOrEqual(quote.authorizationCeiling);
          expect(final).toBeGreaterThanOrEqual(0);
        },
      ),
      { numRuns: 10_000 },
    );
  });

  it("repricing is monotonic in weight", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100_000 }),
        fc.integer({ min: 0, max: 30_000 }),
        fc.integer({ min: 0, max: 30_000 }),
        (price, a, b) => {
          const [lo, hi] = a <= b ? [a, b] : [b, a];
          const f = (g: number) =>
            finalTotal([{ mode: "WEIGHT", pricePerKg: agorot(price), actual: grams(g) }], agorot(0));
          expect(f(lo)).toBeLessThanOrEqual(f(hi));
        },
      ),
      { numRuns: 10_000 },
    );
  });
});
