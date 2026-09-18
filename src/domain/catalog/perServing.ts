import { type Agorot, agorot, divRoundHalfUp } from "../money/agorot";

/**
 * What one helping of a cut costs, from its price per kilo and the grams one person eats. A price per
 * kilo is hard to compare across cuts; "about ₪59 a person" is the number people actually decide on.
 * Integer agorot throughout — the rounding happens once, here.
 */
export function pricePerServing(pricePerKgAgorot: Agorot, servingG: number): Agorot {
  if (servingG <= 0) return agorot(0);
  return agorot(divRoundHalfUp(pricePerKgAgorot * servingG, 1000));
}
