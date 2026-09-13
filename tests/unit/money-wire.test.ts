import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { agorot } from "@/domain/money/agorot";
import { fromDecimalShekels, toDecimalShekels } from "@/domain/money/wire";

describe("decimal shekels on the wire", () => {
  it("formats agorot exactly", () => {
    expect(toDecimalShekels(agorot(46_500))).toBe("465.00");
    expect(toDecimalShekels(agorot(38_705))).toBe("387.05");
    expect(toDecimalShekels(agorot(7))).toBe("0.07");
  });

  it("parses what a provider sends, as string or number", () => {
    expect(fromDecimalShekels("465.5")).toBe(46_550);
    expect(fromDecimalShekels(464.75)).toBe(46_475);
    expect(fromDecimalShekels(465)).toBe(46_500);
    expect(fromDecimalShekels("0.07")).toBe(7);
  });

  it("refuses anything that isn't a plain two-decimal amount", () => {
    for (const bad of ["465.555", "-1", "1e3", "", "₪465", "465,50"]) expect(() => fromDecimalShekels(bad)).toThrow();
  });

  it("round-trips every amount up to ₪100,000, including through a JSON number", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10_000_000 }), (n) => {
        const text = toDecimalShekels(agorot(n));
        expect(fromDecimalShekels(text)).toBe(n);
        expect(fromDecimalShekels(JSON.parse(JSON.stringify(Number(text))) as number)).toBe(n);
      }),
      { numRuns: 10_000 },
    );
  });
});
