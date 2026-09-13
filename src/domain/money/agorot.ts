/**
 * Money is a whole number of agorot (1 ₪ = 100 agorot). There is no decimal money anywhere in
 * this codebase; every division goes through one of the rounding helpers below, so the rounding
 * policy lives in exactly one place.
 *
 * Rounding policy: round half up (x.5 → up). Israeli retail rounds in the customer-visible direction
 * the same way a till does, and every value here is non-negative.
 */

declare const agorotBrand: unique symbol;
export type Agorot = number & { readonly [agorotBrand]: true };

export class MoneyError extends Error {
  override name = "MoneyError";
}

export function agorot(value: number): Agorot {
  if (!Number.isSafeInteger(value)) {
    throw new MoneyError(`Agorot must be a safe integer, got ${value}`);
  }
  return value as Agorot;
}

/** Whole shekels to agorot: `shekels(169)` → 16900. */
export function shekels(value: number): Agorot {
  if (!Number.isSafeInteger(value)) {
    throw new MoneyError(`Shekels must be a whole number, got ${value}`);
  }
  return agorot(value * 100);
}

export const ZERO = agorot(0);

export function add(...values: Agorot[]): Agorot {
  let total = 0;
  for (const v of values) total += v;
  return agorot(total);
}

export function subtract(a: Agorot, b: Agorot): Agorot {
  return agorot(a - b);
}

/** Integer division of non-negative integers, rounded half up. */
export function divRoundHalfUp(numerator: number, denominator: number): number {
  assertNonNegativeInt(numerator, "numerator");
  if (!Number.isSafeInteger(denominator) || denominator <= 0) {
    throw new MoneyError(`Denominator must be a positive integer, got ${denominator}`);
  }
  const product = numerator * 2 + denominator;
  if (!Number.isSafeInteger(product)) {
    throw new MoneyError("Arithmetic overflow in divRoundHalfUp");
  }
  return Math.floor(product / (denominator * 2));
}

/** Integer division of non-negative integers, rounded up. */
export function divCeil(numerator: number, denominator: number): number {
  assertNonNegativeInt(numerator, "numerator");
  if (!Number.isSafeInteger(denominator) || denominator <= 0) {
    throw new MoneyError(`Denominator must be a positive integer, got ${denominator}`);
  }
  return Math.floor((numerator + denominator - 1) / denominator);
}

/** Round up to the next whole shekel: 46475 → 46500. Used for card holds. */
export function ceilToShekel(value: Agorot): Agorot {
  return agorot(divCeil(value, 100) * 100);
}

function assertNonNegativeInt(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new MoneyError(`${label} must be a non-negative safe integer, got ${value}`);
  }
}
