/**
 * Which delivery zone serves a city. Israelis write the same city several ways
 * ("תל אביב", "תל-אביב", "תל אביב–יפו"), so matching is on a normalized form.
 */

export interface ZoneCities {
  id: string;
  active: boolean;
  citiesHe: string[];
  citiesEn: string[];
}

export function normalizeCity(input: string): string {
  return input
    .normalize("NFC")
    .replace(/[־–—-]/g, " ") // maqaf, en/em dash, hyphen — before niqqud removal, whose range contains the maqaf
    .replace(/[֑-ׇ]/g, "") // niqqud and cantillation
    .replace(/["'״׳`]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export type ZoneMatch = { kind: "SERVED"; zoneId: string } | { kind: "INACTIVE"; zoneId: string } | { kind: "NOT_SERVED" };

export function resolveZone(city: string, zones: ZoneCities[]): ZoneMatch {
  const target = normalizeCity(city);
  if (!target) return { kind: "NOT_SERVED" };
  for (const zone of zones) {
    const names = [...zone.citiesHe, ...zone.citiesEn].map(normalizeCity);
    if (names.includes(target)) return zone.active ? { kind: "SERVED", zoneId: zone.id } : { kind: "INACTIVE", zoneId: zone.id };
  }
  return { kind: "NOT_SERVED" };
}
