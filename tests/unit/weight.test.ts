import { describe, expect, it } from "vitest";
import { agorot } from "@/domain/money/agorot";
import { formatGrams, grams, kg, WeightError } from "@/domain/weight/grams";
import { PRICE_FOR_WEIGHT_VECTORS } from "@/domain/weight/reference-vectors";
import { priceForWeight } from "@/domain/weight/reprice";
import { classifyWeight, snapToStep, toleranceBounds } from "@/domain/weight/tolerance";

const visible = (s: string) => s.replace(/[‎‏]/g, "").replace(/ /g, " ");

describe("grams", () => {
  it("accepts non-negative integers only", () => {
    expect(grams(2500)).toBe(2500);
    expect(() => grams(-1)).toThrow(WeightError);
    expect(() => grams(2.5)).toThrow(WeightError);
  });

  it("kg() converts literals exactly", () => {
    expect(kg(2.5)).toBe(2500);
    expect(kg(0.25)).toBe(250);
    expect(() => kg(1.0005)).toThrow(WeightError);
  });

  it("formats in Hebrew and English", () => {
    expect(visible(formatGrams(grams(750), "he"))).toBe("750 גר׳");
    expect(visible(formatGrams(grams(2500), "he"))).toBe("2.5 ק״ג");
    expect(visible(formatGrams(grams(2750), "he"))).toBe("2.75 ק״ג");
    expect(formatGrams(grams(750), "en")).toBe("750 g");
    expect(formatGrams(grams(1000), "en")).toBe("1 kg");
    expect(formatGrams(grams(1234), "en")).toBe("1.234 kg");
  });
});

describe("priceForWeight — explicit vectors", () => {
  it.each([
    [12900, 2500, 32250], // ₪129/kg × 2.5 kg
    [16900, 2500, 42250], // ₪169/kg × 2.5 kg
    [16900, 2750, 46475],
    [16900, 2387, 40340], // 40340.3 → 40340
    [4500, 1333, 5999], // 5998.5 → 5999 (half up)
    [2700, 1, 3], // 2.7 → 3
    [2700, 0, 0],
  ])("%i agorot/kg × %i g = %i agorot", (price, g, expected) => {
    expect(priceForWeight(agorot(price), grams(g))).toBe(expected);
  });

  it.each(PRICE_FOR_WEIGHT_VECTORS)(
    "kitchen-sink reference: $grams g × $pricePerKgAgorot → $expectedAgorot",
    ({ grams: g, pricePerKgAgorot, expectedAgorot }) => {
      expect(priceForWeight(agorot(pricePerKgAgorot), grams(g))).toBe(expectedAgorot);
    },
  );
});

describe("tolerance", () => {
  it("computes ±10% bounds around 2.5 kg", () => {
    expect(toleranceBounds(grams(2500), 1000)).toEqual({
      requested: 2500,
      min: 2250,
      max: 2750,
      toleranceBp: 1000,
    });
  });

  it("keeps both bounds inside the percentage when it does not divide evenly", () => {
    const b = toleranceBounds(grams(333), 1000); // 299.7 .. 366.3
    expect(b.min).toBe(300);
    expect(b.max).toBe(366);
  });

  it("rejects nonsense", () => {
    expect(() => toleranceBounds(grams(0), 1000)).toThrow(WeightError);
    expect(() => toleranceBounds(grams(100), 10000)).toThrow(WeightError);
    expect(() => toleranceBounds(grams(100), -1)).toThrow(WeightError);
  });

  it("classifies at the exact edges", () => {
    const b = toleranceBounds(grams(2500), 1000);
    expect(classifyWeight(grams(2249), b)).toEqual({ kind: "under", shortBy: 1 });
    expect(classifyWeight(grams(2250), b).kind).toBe("within");
    expect(classifyWeight(grams(2500), b)).toEqual({ kind: "within", deviationBp: 0, nearEdge: false });
    expect(classifyWeight(grams(2650), b)).toEqual({ kind: "within", deviationBp: 600, nearEdge: false });
    expect(classifyWeight(grams(2700), b)).toEqual({ kind: "within", deviationBp: 800, nearEdge: false });
    expect(classifyWeight(grams(2701), b)).toMatchObject({ kind: "within", nearEdge: true });
    expect(classifyWeight(grams(2750), b)).toMatchObject({ kind: "within", nearEdge: true });
    expect(classifyWeight(grams(2751), b)).toEqual({ kind: "over", overBy: 1 });
    expect(classifyWeight(grams(3400), b)).toEqual({ kind: "over", overBy: 650 });
  });

  it("snaps requests to the product step and range", () => {
    const [min, max, step] = [grams(500), grams(5000), grams(250)];
    expect(snapToStep(2600, min, max, step)).toBe(2500);
    expect(snapToStep(2630, min, max, step)).toBe(2750);
    expect(snapToStep(100, min, max, step)).toBe(500);
    expect(snapToStep(99999, min, max, step)).toBe(5000);
  });
});
