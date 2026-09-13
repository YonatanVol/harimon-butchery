import { type Agorot, agorot, divRoundHalfUp, MoneyError } from "./agorot";

/** Israeli VAT, in basis points. 18% since 1 Jan 2025. Snapshotted on every order. */
export const ISRAEL_VAT_BP = 1800;

export interface VatBreakdown {
  gross: Agorot;
  vat: Agorot;
  net: Agorot;
}

/**
 * Displayed prices include VAT. Extract the VAT part from a gross amount:
 * vat = round(gross × rate / (10000 + rate)), net = gross − vat, so net + vat === gross exactly.
 */
export function vatFromGross(gross: Agorot, rateBp: number = ISRAEL_VAT_BP): VatBreakdown {
  if (!Number.isSafeInteger(rateBp) || rateBp < 0) {
    throw new MoneyError(`VAT rate must be non-negative basis points, got ${rateBp}`);
  }
  const vat = agorot(divRoundHalfUp(gross * rateBp, 10000 + rateBp));
  return { gross, vat, net: agorot(gross - vat) };
}
