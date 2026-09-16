import { describe, expect, it } from "vitest";
import { type CheckoutDetails, normalizeIsraeliMobile, validateDetails } from "@/domain/checkout/details";
import { renderTemplate, TEMPLATE_KEYS } from "@/domain/notifications/templates";

const valid: CheckoutDetails = {
  firstName: "דנה",
  lastName: "כהן",
  phone: "054-123 4567",
  email: "",
  street: "אבן גבירול",
  houseNumber: "120א",
  entrance: "ב",
  floor: "3",
  apartment: "12",
  intercom: "1234",
  deliveryNotes: "",
  giftRecipient: "",
  giftMessage: "",
};

describe("Israeli mobile numbers", () => {
  it.each(["054-123 4567", "0541234567", "+972 54 123 4567", "972541234567"])("normalizes %s", (input) => {
    expect(normalizeIsraeliMobile(input)).toEqual({ e164: "+972541234567" });
  });

  it("rejects landlines and garbage with distinct reasons", () => {
    expect(normalizeIsraeliMobile("03-123-4567")).toEqual({ error: "PHONE_NOT_MOBILE" });
    expect(normalizeIsraeliMobile("12345")).toEqual({ error: "PHONE_INVALID" });
    expect(normalizeIsraeliMobile("+1 212 555 0100")).toEqual({ error: "PHONE_INVALID" });
  });
});

describe("checkout details", () => {
  it("accepts a complete Israeli address with a lettered house number", () => {
    expect(validateDetails(valid)).toEqual({ ok: true, phoneE164: "+972541234567" });
  });

  it("names every missing or invalid field", () => {
    const r = validateDetails({ ...valid, firstName: " ", street: "", houseNumber: "12-14", phone: "03-1234567", email: "dana@" });
    expect(r).toEqual({
      ok: false,
      errors: { firstName: "REQUIRED", street: "REQUIRED", houseNumber: "HOUSE_NUMBER_INVALID", phone: "PHONE_NOT_MOBILE", email: "EMAIL_INVALID" },
    });
  });
});

describe("notification templates", () => {
  const vars = {
    firstName: "דנה",
    orderNumber: "2026-00042",
    trackingUrl: "https://example.test/o",
    holdAmount: "465 ₪",
    estimateAmount: "422.50 ₪",
    finalAmount: "387 ₪",
    extraAmount: "38 ₪",
    slotWindow: "יום ב׳ 08:00–11:00",
    productName: "אנטריקוט",
    requestedWeight: "2.5 ק״ג",
    actualWeight: "3.4 ק״ג",
    trimmedWeight: "2.75 ק״ג",
    deadline: "14:00",
    refundAmount: "120 ₪",
    reason: "חוסר במלאי",
    code: "482913",
    productUrl: "https://example.test/he/p/entrecote",
    city: "נתניה",
    shopUrl: "https://example.test/he",
  };

  it("every template renders fully in both languages — no missing variables", () => {
    for (const key of TEMPLATE_KEYS) {
      for (const locale of ["he", "en"] as const) {
        const { body } = renderTemplate(key, locale, vars);
        expect(body, `${locale}:${key}`).not.toMatch(/undefined|null|\{|\}/);
        expect(body.length).toBeGreaterThan(20);
      }
    }
  });
});

describe("gift fields", () => {
  it("are optional", () => {
    expect(validateDetails({ ...valid, giftRecipient: "", giftMessage: "" }).ok).toBe(true);
    expect(validateDetails({ ...valid, giftRecipient: "סבתא רחל", giftMessage: "מזל טוב!" }).ok).toBe(true);
  });
  it("are limited in length", () => {
    const long = validateDetails({ ...valid, giftMessage: "א".repeat(301) });
    expect(long.ok).toBe(false);
    if (!long.ok) expect(long.errors.giftMessage).toBe("TOO_LONG");
  });
});
