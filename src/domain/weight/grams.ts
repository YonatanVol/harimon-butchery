/**
 * Weight is a whole number of grams. The weighing keypad has no decimal point at all, which removes
 * the "2.5 vs 25" class of mistakes.
 */

declare const gramsBrand: unique symbol;
export type Grams = number & { readonly [gramsBrand]: true };

export class WeightError extends Error {
  override name = "WeightError";
}

export function grams(value: number): Grams {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new WeightError(`Grams must be a non-negative safe integer, got ${value}`);
  }
  return value as Grams;
}

/** Whole or fractional kilograms from a *literal* (seed data, tests): `kg(2.5)` → 2500 g. */
export function kg(value: number): Grams {
  const g = Math.round(value * 1000);
  if (Math.abs(g - value * 1000) > 1e-6) {
    throw new WeightError(`${value} kg is not a whole number of grams`);
  }
  return grams(g);
}

type AppLocale = "he" | "en";
const intlLocale: Record<AppLocale, string> = { he: "he-IL", en: "en-IL" };

/** Under 1 kg: "750 גר׳" / "750 g". From 1 kg: "2.75 ק״ג" / "2.75 kg". */
export function formatGrams(value: Grams, locale: AppLocale): string {
  if (value < 1000) {
    return new Intl.NumberFormat(intlLocale[locale], {
      style: "unit",
      unit: "gram",
      unitDisplay: "short",
    }).format(value);
  }
  return new Intl.NumberFormat(intlLocale[locale], {
    style: "unit",
    unit: "kilogram",
    unitDisplay: "short",
    maximumFractionDigits: 3,
  }).format(value / 1000);
}
