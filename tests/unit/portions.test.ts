import { describe, expect, it } from "vitest";
import { portionFor } from "@/domain/catalog/portions";

const steak = { minOrderG: 250, maxOrderG: 5000, stepG: 250 };

describe("portionFor", () => {
  it("multiplies the per-person amount and rounds to the butcher's step", () => {
    const r = portionFor({ servingG: 350, people: 4, appetite: "REGULAR", withSides: false }, steak);
    expect(r.wantedG).toBe(1400);
    expect(r.grams).toBe(1500);
    expect(r.adjusted).toBe("NONE");
  });

  it("takes appetite into account", () => {
    expect(portionFor({ servingG: 350, people: 4, appetite: "LIGHT", withSides: false }, steak).grams).toBe(1000);
    expect(portionFor({ servingG: 350, people: 4, appetite: "HEARTY", withSides: false }, steak).grams).toBe(2000);
  });

  it("asks for less when there are sides", () => {
    const withSides = portionFor({ servingG: 350, people: 6, appetite: "REGULAR", withSides: true }, steak);
    const without = portionFor({ servingG: 350, people: 6, appetite: "REGULAR", withSides: false }, steak);
    expect(withSides.wantedG).toBeLessThan(without.wantedG);
    expect(withSides.grams).toBe(1500);
  });

  it("stays inside the cut's limits and says when it had to", () => {
    const tiny = portionFor({ servingG: 350, people: 1, appetite: "LIGHT", withSides: true }, steak);
    expect(tiny.grams).toBe(250);
    expect(tiny.adjusted).toBe("RAISED_TO_MIN");

    const huge = portionFor({ servingG: 350, people: 24, appetite: "HEARTY", withSides: false }, steak);
    expect(huge.grams).toBe(5000);
    expect(huge.adjusted).toBe("LOWERED_TO_MAX");
  });

  it("treats a fraction of a person as a person", () => {
    expect(portionFor({ servingG: 300, people: 0, appetite: "REGULAR", withSides: false }, steak).grams).toBe(250);
  });
});
