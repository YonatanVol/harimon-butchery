import { type Agorot, divRoundHalfUp } from "./agorot";

/** Price change in basis points, signed, rounded half away from zero: 16900 → 18900 is +1183 (11.83%). */
export function percentChangeBp(before: Agorot, after: Agorot): number {
  if (before <= 0) return 0;
  const diff = Math.abs(after - before);
  const bp = divRoundHalfUp(diff * 10_000, before);
  return after >= before ? bp : -bp;
}
