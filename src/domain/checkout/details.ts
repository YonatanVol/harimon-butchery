import { parsePhoneNumberFromString } from "libphonenumber-js";

/**
 * Checkout contact and address rules. Field errors are keys the form turns into sentences,
 * shown next to the field when it loses focus — not on every keystroke.
 */

export interface CheckoutDetails {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  street: string;
  houseNumber: string;
  entrance: string;
  floor: string;
  apartment: string;
  intercom: string;
  deliveryNotes: string;
}

export type FieldError = "REQUIRED" | "PHONE_INVALID" | "PHONE_NOT_MOBILE" | "EMAIL_INVALID" | "TOO_LONG" | "HOUSE_NUMBER_INVALID";

export type DetailsErrors = Partial<Record<keyof CheckoutDetails, FieldError>>;

/** "054-123 4567", "+972 54 1234567", "0541234567" → "+972541234567". Null when not an Israeli mobile. */
export function normalizeIsraeliMobile(input: string): { e164: string } | { error: "PHONE_INVALID" | "PHONE_NOT_MOBILE" } {
  const parsed = parsePhoneNumberFromString(input.trim(), "IL");
  if (!parsed || !parsed.isValid() || parsed.country !== "IL") return { error: "PHONE_INVALID" };
  // The compact metadata build has no number types; Israeli mobiles are 05X + 7 digits.
  if (!/^5\d{8}$/.test(parsed.nationalNumber)) return { error: "PHONE_NOT_MOBILE" };
  return { e164: parsed.number };
}

const LIMITS: Record<keyof CheckoutDetails, number> = {
  firstName: 40,
  lastName: 40,
  phone: 20,
  email: 120,
  street: 80,
  houseNumber: 10,
  entrance: 10,
  floor: 10,
  apartment: 10,
  intercom: 20,
  deliveryNotes: 300,
};

export function validateDetails(d: CheckoutDetails): { ok: true; phoneE164: string } | { ok: false; errors: DetailsErrors } {
  const errors: DetailsErrors = {};
  for (const [key, max] of Object.entries(LIMITS) as Array<[keyof CheckoutDetails, number]>) {
    if ((d[key] ?? "").length > max) errors[key] = "TOO_LONG";
  }
  for (const key of ["firstName", "lastName", "phone", "street", "houseNumber"] as const) {
    if (!d[key]?.trim()) errors[key] = "REQUIRED";
  }
  if (!errors.houseNumber && !/^\d{1,4}[א-תa-zA-Z]?$/.test(d.houseNumber.trim())) errors.houseNumber = "HOUSE_NUMBER_INVALID";
  let phoneE164 = "";
  if (!errors.phone) {
    const p = normalizeIsraeliMobile(d.phone);
    if ("error" in p) errors.phone = p.error;
    else phoneE164 = p.e164;
  }
  if (d.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email.trim())) errors.email = "EMAIL_INVALID";
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, phoneE164 };
}
