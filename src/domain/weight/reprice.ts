import { type Agorot, agorot, divRoundHalfUp } from "../money/agorot";
import type { Grams } from "./grams";

/** Price of a weighed piece: round(₪/kg in agorot × grams / 1000). */
export function priceForWeight(pricePerKg: Agorot, weight: Grams): Agorot {
  return agorot(divRoundHalfUp(pricePerKg * weight, 1000));
}
