/**
 * Recipe arithmetic: scaling ingredient lines to the chosen servings, and turning grams-per-serving into what the
 * butcher actually cuts. Weights are integer grams. Pure — no I/O.
 */

/** The cut's ordering rules, as far as a recipe needs them. */
export interface CutRules {
  gramsPerServing?: number | undefined;
  minOrderG: number | null;
  maxOrderG: number | null;
  stepG: number | null;
}

const FRACTIONS: Record<string, number> = { "½": 0.5, "¼": 0.25, "¾": 0.75 };
const FRACTION_CHAR: Record<number, string> = { 0.25: "¼", 0.5: "½", 0.75: "¾" };

/**
 * Scales the first quantity in an ingredient line ("1½ כפיות מלח" ×2 → "3 כפיות מלח"). Mixed numbers are read as one
 * value; nothing ever scales down to zero (the smallest shown amount is ¼). Lines without a number stay as written.
 */
export function scaleLine(line: string, factor: number): string {
  if (factor === 1) return line;
  return line.replace(/(\d+(?:[.,]\d+)?)?([½¼¾])?/u, (match, num: string | undefined, frac: string | undefined) => {
    if (!num && !frac) return match;
    const value = (num ? Number(num.replace(",", ".")) : 0) + (frac ? FRACTIONS[frac] : 0);
    const scaled = value * factor;
    const nice = scaled >= 10 ? Math.round(scaled) : Math.max(0.25, Math.round(scaled * 4) / 4);
    const whole = Math.floor(nice);
    const fracChar = FRACTION_CHAR[nice - whole] ?? "";
    return fracChar ? `${whole > 0 ? whole : ""}${fracChar}` : String(nice);
  });
}

/** Grams the butcher can actually cut for this many servings: rounded to the product's step and kept within its limits. */
export function gramsFor(m: CutRules, servings: number): number {
  const step = m.stepG ?? 250;
  const raw = (m.gramsPerServing ?? 0) * servings;
  const rounded = Math.max(step, Math.round(raw / step) * step);
  return Math.min(m.maxOrderG ?? rounded, Math.max(m.minOrderG ?? 0, rounded));
}

/** True when the recipe wants more than one order of this cut may hold, so the amount shown is the cap. */
export function cappedAt(m: CutRules, servings: number): boolean {
  const step = m.stepG ?? 250;
  const wanted = Math.round(((m.gramsPerServing ?? 0) * servings) / step) * step;
  return m.maxOrderG !== null && wanted > m.maxOrderG;
}
