import { describe, expect, it } from "vitest";
import { CODE128_PATTERNS, code128Values, code128Widths } from "@/domain/print/code128";

describe("Code 128 set B", () => {
  it("has 106 distinct symbol patterns of 11 modules each", () => {
    expect(CODE128_PATTERNS).toHaveLength(106);
    expect(new Set(CODE128_PATTERNS).size).toBe(106);
    for (const p of CODE128_PATTERNS) expect([...p].reduce((s, d) => s + Number(d), 0)).toBe(11);
  });

  it("computes the checksum as (start + Σ value × position) mod 103", () => {
    // 104 + 48·1 + 42·2 + 42·3 + 17·4 + 18·5 + 19·6 + 35·7 = 879; 879 mod 103 = 55.
    expect(code128Values("PJJ123C")).toEqual([104, 48, 42, 42, 17, 18, 19, 35, 55]);
  });

  it("encodes an order number into 11 modules per symbol plus a 13-module stop", () => {
    const widths = code128Widths("2026-00011");
    const symbols = 1 + "2026-00011".length + 1;
    expect(widths.reduce((s, w) => s + w, 0)).toBe(symbols * 11 + 13);
    expect(widths.length % 2).toBe(1); // starts and ends with a bar
  });

  it("refuses characters outside set B", () => {
    expect(() => code128Values("הזמנה")).toThrow();
    expect(() => code128Values("")).toThrow();
  });
});
