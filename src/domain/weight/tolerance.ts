import { divCeil } from "../money/agorot";
import { type Grams, grams, WeightError } from "./grams";

/** Default weighing tolerance: ±10%. */
export const DEFAULT_TOLERANCE_BP = 1000;

/** Within this distance of the upper bound the weighing screen turns amber. */
export const NEAR_EDGE_BP = 200;

export interface ToleranceBounds {
  requested: Grams;
  min: Grams;
  max: Grams;
  toleranceBp: number;
}

export function toleranceBounds(requested: Grams, toleranceBp: number): ToleranceBounds {
  if (!Number.isSafeInteger(toleranceBp) || toleranceBp < 0 || toleranceBp >= 10000) {
    throw new WeightError(`Tolerance must be 0–9999 basis points, got ${toleranceBp}`);
  }
  if (requested <= 0) {
    throw new WeightError("Requested weight must be positive");
  }
  // max rounds DOWN and min rounds UP, so both bounds stay inside the stated percentage.
  const max = Math.floor((requested * (10000 + toleranceBp)) / 10000);
  const min = divCeil(requested * (10000 - toleranceBp), 10000);
  return { requested, min: grams(min), max: grams(max), toleranceBp };
}

export type ToleranceStatus =
  | { kind: "under"; shortBy: Grams }
  | { kind: "within"; deviationBp: number; nearEdge: boolean }
  | { kind: "over"; overBy: Grams };

/** Where an actual weight falls relative to its bounds. `deviationBp` is signed vs. requested. */
export function classifyWeight(actual: Grams, bounds: ToleranceBounds): ToleranceStatus {
  if (actual < bounds.min) return { kind: "under", shortBy: grams(bounds.min - actual) };
  if (actual > bounds.max) return { kind: "over", overBy: grams(actual - bounds.max) };
  const deviationBp = Math.round(((actual - bounds.requested) * 10000) / bounds.requested);
  const edgeStart = bounds.max - Math.floor((bounds.requested * NEAR_EDGE_BP) / 10000);
  return { kind: "within", deviationBp, nearEdge: actual > edgeStart };
}

/** Snap a customer's requested weight to the product's step and range. */
export function snapToStep(value: number, min: Grams, max: Grams, step: Grams): Grams {
  if (step <= 0) throw new WeightError("Step must be positive");
  const clamped = Math.min(Math.max(value, min), max);
  const steps = Math.round((clamped - min) / step);
  return grams(Math.min(min + steps * step, max));
}
