/**
 * Customer sign-in by phone: a 6-digit code, valid 5 minutes, 5 tries. At most 3 codes per phone in
 * 15 minutes and one every 30 seconds — enough for a slow WhatsApp, not enough to spam someone.
 */

export const OTP_LENGTH = 6;
export const OTP_TTL_SECONDS = 5 * 60;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_MAX_SENDS = 3;
export const OTP_SEND_WINDOW_SECONDS = 15 * 60;
export const OTP_RESEND_AFTER_SECONDS = 30;

export type SendDecision = { ok: true } | { ok: false; retryAfterSeconds: number };

/** `recentSends`: when earlier codes for this phone were created, any order. */
export function sendAllowed(recentSends: readonly Date[], now: Date): SendDecision {
  const t = now.getTime();
  const inWindow = recentSends.map((d) => d.getTime()).filter((s) => s > t - OTP_SEND_WINDOW_SECONDS * 1000 && s <= t).sort((a, b) => a - b);
  const latest = inWindow.at(-1);
  if (latest !== undefined && t - latest < OTP_RESEND_AFTER_SECONDS * 1000) {
    return { ok: false, retryAfterSeconds: Math.ceil((latest + OTP_RESEND_AFTER_SECONDS * 1000 - t) / 1000) };
  }
  if (inWindow.length >= OTP_MAX_SENDS) {
    return { ok: false, retryAfterSeconds: Math.ceil((inWindow[inWindow.length - OTP_MAX_SENDS] + OTP_SEND_WINDOW_SECONDS * 1000 - t) / 1000) };
  }
  return { ok: true };
}

export function isWellFormedCode(code: string): boolean {
  return new RegExp(`^\\d{${OTP_LENGTH}}$`).test(code);
}

/** Codes never stay readable in the message log once sent. */
export function maskCode(text: string): string {
  return text.replace(new RegExp(`\\b\\d{${OTP_LENGTH}}\\b`, "g"), "•".repeat(OTP_LENGTH));
}
