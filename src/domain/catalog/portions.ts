/**
 * "How much meat do I need?" — turns a number of people and how hungry they are into grams the butcher can cut.
 * Pure: integer grams in, integer grams out.
 */

export const APPETITES = ["LIGHT", "REGULAR", "HEARTY"] as const;
export type Appetite = (typeof APPETITES)[number];

/** A light eater takes about three quarters of a normal portion; a hearty one about a third more. */
const APPETITE_FACTOR: Record<Appetite, number> = { LIGHT: 0.75, REGULAR: 1, HEARTY: 1.35 };

/** Sides and starters take the edge off: a cut served alongside other dishes needs about a quarter less. */
const SIDES_FACTOR = 0.75;

export interface PortionInput {
  /** Grams per person for this cut when it is the main dish (from the product's facts). */
  servingG: number;
  people: number;
  appetite: Appetite;
  /** True when the meal has substantial sides or other dishes. */
  withSides: boolean;
}

export interface CutLimits {
  minOrderG: number;
  maxOrderG: number;
  stepG: number;
}

export interface PortionResult {
  /** What the butcher will actually cut: rounded to the cut's step and inside its limits. */
  grams: number;
  /** What the calculation asked for, before rounding and limits. */
  wantedG: number;
  /** The amount had to be raised to the smallest order, or lowered to the largest. */
  adjusted: "NONE" | "RAISED_TO_MIN" | "LOWERED_TO_MAX";
}

export function portionFor(input: PortionInput, limits: CutLimits): PortionResult {
  const people = Math.max(1, Math.round(input.people));
  const wantedG = Math.round(input.servingG * people * APPETITE_FACTOR[input.appetite] * (input.withSides ? SIDES_FACTOR : 1));

  const step = Math.max(1, limits.stepG);
  const rounded = Math.round(wantedG / step) * step;
  const grams = Math.min(limits.maxOrderG, Math.max(limits.minOrderG, rounded));

  // Say so whenever the cut itself can't match the request — not for the small rounding to the next step.
  const adjusted = wantedG < limits.minOrderG ? "RAISED_TO_MIN" : wantedG > limits.maxOrderG ? "LOWERED_TO_MAX" : "NONE";
  return { grams, wantedG, adjusted };
}
