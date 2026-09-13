import { describe, expect, it } from "vitest";
import { normalizeCity, resolveZone, type ZoneCities } from "@/domain/delivery/zones";

const zones: ZoneCities[] = [
  { id: "ta", active: true, citiesHe: ["תל אביב", "תל אביב-יפו", "יפו"], citiesEn: ["Tel Aviv", "Jaffa"] },
  { id: "modiin", active: true, citiesHe: ["מודיעין-מכבים-רעות"], citiesEn: ["Modi'in"] },
  { id: "eilat", active: false, citiesHe: ["אילת"], citiesEn: ["Eilat"] },
];

describe("zones", () => {
  it("normalizes the ways people write city names", () => {
    expect(normalizeCity("  תל-אביב–יפו ")).toBe("תל אביב יפו");
    expect(normalizeCity("מודיעין־מכבים־רעות")).toBe("מודיעין מכבים רעות");
    expect(normalizeCity("Modi'in")).toBe("modiin");
  });

  it("resolves Hebrew and English spellings", () => {
    expect(resolveZone("תל-אביב", zones)).toEqual({ kind: "SERVED", zoneId: "ta" });
    expect(resolveZone("תל אביב–יפו", zones)).toEqual({ kind: "SERVED", zoneId: "ta" });
    expect(resolveZone("tel aviv", zones)).toEqual({ kind: "SERVED", zoneId: "ta" });
    expect(resolveZone("מודיעין מכבים רעות", zones)).toEqual({ kind: "SERVED", zoneId: "modiin" });
  });

  it("distinguishes a paused zone from a city we don't serve", () => {
    expect(resolveZone("אילת", zones)).toEqual({ kind: "INACTIVE", zoneId: "eilat" });
    expect(resolveZone("צפת", zones)).toEqual({ kind: "NOT_SERVED" });
    expect(resolveZone("   ", zones)).toEqual({ kind: "NOT_SERVED" });
  });
});
