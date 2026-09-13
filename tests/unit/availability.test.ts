import { describe, expect, it } from "vitest";
import { availabilityOf, orderableMaxG, type StockSnapshot } from "@/domain/catalog/availability";

const weight: StockSnapshot = {
  pricingMode: "WEIGHT",
  onHandG: 40_000,
  reservedG: 0,
  onHandUnits: 0,
  reservedUnits: 0,
  lowThresholdG: 3_000,
  lowThresholdUnits: 0,
  minOrderG: 250,
  nextRestockDate: null,
};

const pkg: StockSnapshot = { ...weight, pricingMode: "PACKAGE", onHandG: 0, onHandUnits: 30, lowThresholdG: 0, lowThresholdUnits: 4, minOrderG: null };

describe("availability", () => {
  it("weight products: in stock, low, out by minimum order", () => {
    expect(availabilityOf(weight).kind).toBe("IN_STOCK");
    expect(availabilityOf({ ...weight, onHandG: 2_999 }).kind).toBe("LOW");
    expect(availabilityOf({ ...weight, onHandG: 3_000 }).kind).toBe("IN_STOCK");
    expect(availabilityOf({ ...weight, onHandG: 249 })).toEqual({ kind: "OUT", restockDate: null });
    expect(availabilityOf({ ...weight, onHandG: 250 }).kind).toBe("LOW");
  });

  it("reserved stock is not available", () => {
    expect(availabilityOf({ ...weight, onHandG: 5_000, reservedG: 4_900, nextRestockDate: "2026-09-20" })).toEqual({
      kind: "OUT",
      restockDate: "2026-09-20",
    });
  });

  it("package products count units", () => {
    expect(availabilityOf(pkg).kind).toBe("IN_STOCK");
    expect(availabilityOf({ ...pkg, onHandUnits: 3 }).kind).toBe("LOW");
    expect(availabilityOf({ ...pkg, onHandUnits: 0 }).kind).toBe("OUT");
  });

  it("caps the orderable maximum by available stock, on the product's steps", () => {
    expect(orderableMaxG(5_000, 250, 250, 40_000)).toBe(5_000);
    expect(orderableMaxG(5_000, 250, 250, 2_100)).toBe(2_000);
    expect(orderableMaxG(9_000, 1_800, 1_800, 4_000)).toBe(3_600);
    expect(orderableMaxG(5_000, 250, 500, 400)).toBe(0);
  });
});
