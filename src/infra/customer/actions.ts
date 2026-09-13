"use server";

import { refresh } from "next/cache";
import { sessionSecret } from "../auth/signed";
import { db } from "../db/client";
import { kickDispatch } from "../notify/kick";
import { activeNotifier, demoMessagingIntended } from "../notify/providers";
import { requestLoginCode, verifyLoginCode } from "./login";
import { endCustomerSession, startCustomerSession } from "./session";

export async function customerRequestCode(phone: string, locale: "he" | "en") {
  const r = await requestLoginCode(db, { phone: String(phone ?? "").slice(0, 30), locale: locale === "en" ? "en" : "he", secret: sessionSecret(), // The code is shown on screen only in deliberate demo mode — never because a real provider is misconfigured.
    demo: activeNotifier().demo && demoMessagingIntended() });
  if (r.ok) kickDispatch();
  return r.ok ? { ok: true as const, phoneE164: r.phoneE164, expiresAt: r.expiresAt.toISOString(), demoCode: r.demoCode } : r;
}

export async function customerVerifyCode(phone: string, code: string) {
  const r = await verifyLoginCode(db, { phone: String(phone ?? "").slice(0, 30), code: String(code ?? "").slice(0, 12), secret: sessionSecret() });
  if (!r.ok) return r;
  await startCustomerSession(r.phoneE164);
  refresh();
  return { ok: true as const };
}

export async function customerSignOut() {
  await endCustomerSession();
  refresh();
}
