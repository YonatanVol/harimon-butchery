import "server-only";
import { cookies } from "next/headers";
import { openSession, sealSession } from "../auth/signed";

const COOKIE = "hr_customer";
const MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export async function startCustomerSession(phoneE164: string) {
  (await cookies()).set(COOKIE, sealSession({ phone: phoneE164 }, MAX_AGE_SECONDS), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function endCustomerSession() {
  (await cookies()).delete(COOKIE);
}

/** The verified phone of the signed-in customer, or null. */
export async function currentCustomerPhone(): Promise<string | null> {
  const session = openSession<{ phone: string }>((await cookies()).get(COOKIE)?.value);
  return session && typeof session.phone === "string" && /^\+972\d{8,9}$/.test(session.phone) ? session.phone : null;
}
