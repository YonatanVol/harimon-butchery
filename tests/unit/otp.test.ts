import { describe, expect, it } from "vitest";
import { isWellFormedCode, maskCode, OTP_MAX_SENDS, sendAllowed } from "@/domain/auth/otp";

const at = (s: number) => new Date(Date.UTC(2026, 8, 13, 10, 0, 0) + s * 1000);

describe("login code rules", () => {
  it("allows the first code", () => {
    expect(sendAllowed([], at(0))).toEqual({ ok: true });
  });

  it("asks to wait 30 seconds between codes, counting down", () => {
    expect(sendAllowed([at(0)], at(10))).toEqual({ ok: false, retryAfterSeconds: 20 });
    expect(sendAllowed([at(0)], at(30))).toEqual({ ok: true });
  });

  it("stops after three codes in 15 minutes, until the oldest ages out", () => {
    const sends = [at(0), at(60), at(120)];
    expect(OTP_MAX_SENDS).toBe(3);
    expect(sendAllowed(sends, at(200))).toEqual({ ok: false, retryAfterSeconds: 900 - 200 });
    expect(sendAllowed(sends, at(900))).toEqual({ ok: true });
  });

  it("ignores sends outside the window", () => {
    expect(sendAllowed([at(-2000), at(-1500), at(-1000)], at(0))).toEqual({ ok: true });
  });

  it("accepts exactly six digits", () => {
    expect(isWellFormedCode("123456")).toBe(true);
    for (const bad of ["12345", "1234567", "12a456", " 123456", "١٢٣٤٥٦"]) expect(isWellFormedCode(bad)).toBe(false);
  });

  it("masks the code but not order numbers or prices", () => {
    expect(maskCode("קוד הכניסה שלך: 482913\nהקוד בתוקף ל-5 דקות")).toBe("קוד הכניסה שלך: ••••••\nהקוד בתוקף ל-5 דקות");
    expect(maskCode("הזמנה 2026-00011 · 666.26 ₪")).toBe("הזמנה 2026-00011 · 666.26 ₪");
  });
});
