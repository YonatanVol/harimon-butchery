import { describe, expect, it } from "vitest";
import {
  add,
  agorot,
  ceilToShekel,
  divCeil,
  divRoundHalfUp,
  MoneyError,
  shekels,
  subtract,
} from "@/domain/money/agorot";
import { formatAgorot } from "@/domain/money/format";
import { ISRAEL_VAT_BP, vatFromGross } from "@/domain/money/vat";

/** Strip the invisible bidi marks Intl inserts so assertions read naturally. */
const visible = (s: string) => s.replace(/[‎‏ ]/g, (c) => (c === " " ? " " : ""));

describe("agorot", () => {
  it("accepts safe integers only", () => {
    expect(agorot(0)).toBe(0);
    expect(agorot(16900)).toBe(16900);
    expect(() => agorot(1.5)).toThrow(MoneyError);
    expect(() => agorot(Number.NaN)).toThrow(MoneyError);
    expect(() => agorot(2 ** 53)).toThrow(MoneyError);
  });

  it("converts whole shekels", () => {
    expect(shekels(169)).toBe(16900);
    expect(() => shekels(169.9)).toThrow(MoneyError);
  });

  it("adds and subtracts", () => {
    expect(add()).toBe(0);
    expect(add(agorot(100), agorot(250), agorot(1))).toBe(351);
    expect(subtract(agorot(500), agorot(120))).toBe(380);
  });
});

describe("rounding", () => {
  it.each([
    [10, 4, 3], // 2.5 → 3 (half up)
    [9, 4, 2], // 2.25 → 2
    [11, 4, 3], // 2.75 → 3
    [0, 7, 0],
    [7, 7, 1],
    [5, 10, 1], // 0.5 → 1
    [4, 10, 0],
  ])("divRoundHalfUp(%i, %i) = %i", (n, d, expected) => {
    expect(divRoundHalfUp(n, d)).toBe(expected);
  });

  it.each([
    [0, 100, 0],
    [1, 100, 1],
    [100, 100, 1],
    [101, 100, 2],
  ])("divCeil(%i, %i) = %i", (n, d, expected) => {
    expect(divCeil(n, d)).toBe(expected);
  });

  it("rejects negative numerators and non-positive denominators", () => {
    expect(() => divRoundHalfUp(-1, 2)).toThrow(MoneyError);
    expect(() => divRoundHalfUp(1, 0)).toThrow(MoneyError);
    expect(() => divCeil(1, -3)).toThrow(MoneyError);
  });

  it("rounds holds up to the whole shekel", () => {
    expect(ceilToShekel(agorot(46475))).toBe(46500);
    expect(ceilToShekel(agorot(46500))).toBe(46500);
    expect(ceilToShekel(agorot(1))).toBe(100);
    expect(ceilToShekel(agorot(0))).toBe(0);
  });
});

describe("VAT (18%, prices include VAT)", () => {
  it("uses 18%", () => {
    expect(ISRAEL_VAT_BP).toBe(1800);
  });

  it.each([
    [11800, 1800, 10000],
    [16900, 2578, 14322], // 16900 × 1800 / 11800 = 2577.97 → 2578
    [100, 15, 85], // 15.25 → 15
    [0, 0, 0],
  ])("gross %i → vat %i, net %i", (gross, vat, net) => {
    expect(vatFromGross(agorot(gross))).toEqual({ gross, vat, net });
  });

  it("net + vat === gross for every amount from 1 agora to ₪2,000", () => {
    for (let g = 1; g <= 200_000; g++) {
      const { vat, net } = vatFromGross(agorot(g));
      if (net + vat !== g || vat < 0 || net < 0) {
        throw new Error(`VAT split broken at ${g}: vat=${vat} net=${net}`);
      }
    }
  });
});

describe("formatAgorot", () => {
  it("prints whole shekels without decimals and others with two", () => {
    expect(visible(formatAgorot(agorot(16900), "he"))).toBe("169 ₪");
    expect(visible(formatAgorot(agorot(12990), "he"))).toBe("129.90 ₪");
    expect(visible(formatAgorot(agorot(12950), "he"))).toBe("129.50 ₪");
    expect(formatAgorot(agorot(12990), "en")).toBe("₪129.90");
    expect(formatAgorot(agorot(46500), "en")).toBe("₪465");
  });
});

describe("price change percentage", () => {
  it("is signed basis points, rounded half up in size", async () => {
    const { percentChangeBp } = await import("@/domain/money/change");
    const { agorot } = await import("@/domain/money/agorot");
    expect(percentChangeBp(agorot(16_900), agorot(18_900))).toBe(1183);
    expect(percentChangeBp(agorot(18_900), agorot(16_900))).toBe(-1058);
    expect(percentChangeBp(agorot(10_000), agorot(10_000))).toBe(0);
    expect(percentChangeBp(agorot(3), agorot(4))).toBe(3333);
  });
});
