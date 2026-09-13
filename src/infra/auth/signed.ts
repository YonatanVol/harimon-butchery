import { createHmac, timingSafeEqual } from "node:crypto";

/** Session cookies are `base64url(json).hmac` — tamper-evident, readable by nobody but the server that signed them. */

export function sessionSecret(env = process.env) {
  const s = env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET must be set (32+ chars). See .env.example.");
  return s;
}

function sign(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function sealSession(data: Record<string, unknown>, maxAgeSeconds: number, secret = sessionSecret()) {
  const payload = Buffer.from(JSON.stringify({ ...data, exp: Math.floor(Date.now() / 1000) + maxAgeSeconds })).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

export function openSession<T extends Record<string, unknown>>(raw: string | undefined, secret = sessionSecret()): T | null {
  if (!raw) return null;
  const [payload, signature] = raw.split(".");
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload, secret));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString()) as T & { exp: number };
    return typeof parsed.exp === "number" && parsed.exp >= Date.now() / 1000 ? parsed : null;
  } catch {
    return null;
  }
}

/** Keyed hash for short secrets (login codes): useless without the server secret, compared in constant time. */
export function keyedHash(value: string, secret = sessionSecret()) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function sameHash(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
