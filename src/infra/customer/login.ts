import { randomInt } from "node:crypto";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { isWellFormedCode, OTP_LENGTH, OTP_MAX_ATTEMPTS, OTP_SEND_WINDOW_SECONDS, OTP_TTL_SECONDS, sendAllowed } from "@/domain/auth/otp";
import { normalizeIsraeliMobile } from "@/domain/checkout/details";
import { renderTemplate, templateParams } from "@/domain/notifications/templates";
import { keyedHash, sameHash } from "../auth/signed";
import type * as schema from "../db/schema";
import { customer, customerLoginCode, notification } from "../db/schema";

type Database = NodePgDatabase<typeof schema>;

export type LoginProblem =
  | { key: "PHONE_INVALID" }
  | { key: "PHONE_NOT_MOBILE" }
  | { key: "WAIT"; retryAfterSeconds: number }
  | { key: "CODE_MALFORMED" }
  | { key: "NO_CODE" }
  | { key: "EXPIRED" }
  | { key: "WRONG_CODE"; attemptsLeft: number }
  | { key: "TOO_MANY_ATTEMPTS" };

const hashFor = (phoneE164: string, code: string, secret: string) => keyedHash(`${phoneE164}:${code}`, secret);

/**
 * Send a sign-in code by WhatsApp/SMS. Anyone may ask for a code to their own phone; whether the phone
 * has ordered before is not revealed. `demoCode` is returned only when messages aren't really sent.
 */
export async function requestLoginCode(
  db: Database,
  input: { phone: string; locale: "he" | "en"; secret: string; demo: boolean; now?: Date },
): Promise<{ ok: true; phoneE164: string; expiresAt: Date; demoCode: string | null } | { ok: false; problem: LoginProblem }> {
  const now = input.now ?? new Date();
  const parsed = normalizeIsraeliMobile(input.phone);
  if ("error" in parsed) return { ok: false, problem: { key: parsed.error } };
  const phoneE164 = parsed.e164;

  const recent = await db
    .select({ createdAt: customerLoginCode.createdAt })
    .from(customerLoginCode)
    .where(and(eq(customerLoginCode.phoneE164, phoneE164), gt(customerLoginCode.createdAt, new Date(now.getTime() - OTP_SEND_WINDOW_SECONDS * 1000))));
  const allowed = sendAllowed(
    recent.map((r) => r.createdAt),
    now,
  );
  if (!allowed.ok) return { ok: false, problem: { key: "WAIT", retryAfterSeconds: allowed.retryAfterSeconds } };

  const code = String(randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, "0");
  const expiresAt = new Date(now.getTime() + OTP_TTL_SECONDS * 1000);
  const [known] = await db.select({ id: customer.id, locale: customer.preferredLocale }).from(customer).where(eq(customer.phoneE164, phoneE164));
  const locale = input.locale;
  const { body } = renderTemplate("auth.otp", locale, { code });

  await db.transaction(async (tx) => {
    const [row] = await tx.insert(customerLoginCode).values({ phoneE164, codeHash: hashFor(phoneE164, code, input.secret), expiresAt, createdAt: now }).returning({ id: customerLoginCode.id });
    await tx.insert(notification).values({
      customerId: known?.id ?? null,
      templateKey: "auth.otp",
      channel: "WHATSAPP",
      provider: "MOCK",
      toE164: phoneE164,
      locale,
      renderedBody: body,
      templateParams: templateParams("auth.otp", { code }),
      idempotencyKey: `login:${row.id}`,
    });
  });

  return { ok: true, phoneE164, expiresAt, demoCode: input.demo ? code : null };
}

/** Check a code against the newest unused one for this phone. A correct code works once. */
export async function verifyLoginCode(
  db: Database,
  input: { phone: string; code: string; secret: string; now?: Date },
): Promise<{ ok: true; phoneE164: string; customerId: string | null } | { ok: false; problem: LoginProblem }> {
  const now = input.now ?? new Date();
  const parsed = normalizeIsraeliMobile(input.phone);
  if ("error" in parsed) return { ok: false, problem: { key: parsed.error } };
  const phoneE164 = parsed.e164;
  const code = input.code.trim();
  if (!isWellFormedCode(code)) return { ok: false, problem: { key: "CODE_MALFORMED" } };

  return db.transaction(async (tx) => {
    const [latest] = await tx
      .select()
      .from(customerLoginCode)
      .where(and(eq(customerLoginCode.phoneE164, phoneE164), isNull(customerLoginCode.consumedAt)))
      .orderBy(desc(customerLoginCode.createdAt))
      .limit(1)
      .for("update");
    if (!latest) return { ok: false as const, problem: { key: "NO_CODE" as const } };
    if (latest.expiresAt <= now) return { ok: false as const, problem: { key: "EXPIRED" as const } };
    if (latest.attempts >= OTP_MAX_ATTEMPTS) return { ok: false as const, problem: { key: "TOO_MANY_ATTEMPTS" as const } };

    if (!sameHash(latest.codeHash, hashFor(phoneE164, code, input.secret))) {
      const attempts = latest.attempts + 1;
      await tx.update(customerLoginCode).set({ attempts }).where(eq(customerLoginCode.id, latest.id));
      return attempts >= OTP_MAX_ATTEMPTS
        ? { ok: false as const, problem: { key: "TOO_MANY_ATTEMPTS" as const } }
        : { ok: false as const, problem: { key: "WRONG_CODE" as const, attemptsLeft: OTP_MAX_ATTEMPTS - attempts } };
    }

    await tx.update(customerLoginCode).set({ consumedAt: now }).where(eq(customerLoginCode.id, latest.id));
    const [known] = await tx.update(customer).set({ phoneVerifiedAt: now }).where(eq(customer.phoneE164, phoneE164)).returning({ id: customer.id });
    return { ok: true as const, phoneE164, customerId: known?.id ?? null };
  });
}
