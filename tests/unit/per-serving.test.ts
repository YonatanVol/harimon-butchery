import { describe, expect, it } from "vitest";
import { pricePerServing } from "@/domain/catalog/perServing";
import { agorot } from "@/domain/money/agorot";

describe("pricePerServing", () => {
  it("turns a price per kilo and a helping into what one person costs", () => {
    // ₪169 a kilo, 350 g a person → ₪59.15
    expect(pricePerServing(agorot(16_900), 350)).toBe(5915);
    expect(pricePerServing(agorot(9_900), 1000)).toBe(9900);
  });

  it("rounds half up, in agorot, and never to a fraction", () => {
    expect(pricePerServing(agorot(16_900), 333)).toBe(5628);
    expect(Number.isInteger(pricePerServing(agorot(12_345), 177))).toBe(true);
  });

  it("is zero when a helping is unknown, instead of dividing by nothing", () => {
    expect(pricePerServing(agorot(16_900), 0)).toBe(0);
    expect(pricePerServing(agorot(16_900), -1)).toBe(0);
  });
});
