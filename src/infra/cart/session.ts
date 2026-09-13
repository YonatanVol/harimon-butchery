import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "hr_cart";
const THIRTY_DAYS = 60 * 60 * 24 * 30;

/** The anonymous cart token. Opaque, random, http-only — it identifies a cart, nothing else. */
export async function readCartToken(): Promise<string | null> {
  const value = (await cookies()).get(COOKIE)?.value;
  return value && /^[A-Za-z0-9_-]{32,64}$/.test(value) ? value : null;
}

/** Only callable from Server Actions and Route Handlers, where cookies can be written. */
export async function ensureCartToken(): Promise<string> {
  const existing = await readCartToken();
  if (existing) return existing;
  const token = randomBytes(24).toString("base64url");
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: THIRTY_DAYS,
  });
  return token;
}
