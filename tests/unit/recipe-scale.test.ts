import { describe, expect, it } from "vitest";
import { cappedAt, gramsFor, scaleLine } from "@/domain/recipes/scale";

describe("scaleLine", () => {
  it("leaves lines alone at the base servings", () => {
    expect(scaleLine("2 בצלים גדולים", 1)).toBe("2 בצלים גדולים");
  });
  it("scales whole numbers and decimals", () => {
    expect(scaleLine("2 בצלים גדולים", 1.5)).toBe("3 בצלים גדולים");
    expect(scaleLine("200 מ״ל יין אדום", 2)).toBe("400 מ״ל יין אדום");
  });
  it("reads a mixed number as one value", () => {
    expect(scaleLine("1½ tsp salt", 2)).toBe("3 tsp salt");
    expect(scaleLine("½ כוס מים", 3)).toBe("1½ כוס מים");
  });
  it("never scales an amount down to zero", () => {
    expect(scaleLine("1 tsp turmeric", 0.125)).toBe("¼ tsp turmeric");
  });
  it("keeps lines without a number as written", () => {
    expect(scaleLine("מלח ופלפל לפי הטעם", 2)).toBe("מלח ופלפל לפי הטעם");
  });
});

describe("gramsFor", () => {
  const steak = { gramsPerServing: 350, minOrderG: 250, maxOrderG: 5000, stepG: 250 };
  it("rounds to the butcher's step", () => {
    expect(gramsFor(steak, 4)).toBe(1500); // 1400 → nearest 250
    expect(gramsFor(steak, 6)).toBe(2000); // 2100 → nearest 250
  });
  it("keeps within the cut's limits and says when it is capped", () => {
    expect(gramsFor(steak, 24)).toBe(5000);
    expect(cappedAt(steak, 24)).toBe(true);
    expect(cappedAt(steak, 4)).toBe(false);
    expect(gramsFor({ ...steak, gramsPerServing: 50 }, 1)).toBe(250);
  });
});
