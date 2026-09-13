import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { customer, customerLoginCode, notification } from "@/infra/db/schema";
import { requestLoginCode, verifyLoginCode } from "@/infra/customer/login";
import { dispatchQueued, requeue } from "@/infra/notify/dispatch";
import { connectTestDb, truncateAll } from "./support/db";

const { db, close } = connectTestDb();
beforeEach(() => truncateAll(db));
afterAll(() => close());

const secret = "test-secret-test-secret-test-secret-123";
const phone = "054-123 4567";
const at = (s: number) => new Date(Date.UTC(2026, 8, 13, 10, 0, 0) + s * 1000);

async function codeAt(s = 0) {
  const r = await requestLoginCode(db, { phone, locale: "he", secret, demo: true, now: at(s) });
  if (!r.ok) throw new Error(r.problem.key);
  return r.demoCode!;
}

describe("customer sign-in by phone", () => {
  it("sends a code in a message, stores only a hash, and signs in once", async () => {
    await db.insert(customer).values({ phoneE164: "+972541234567", firstName: "דנה", lastName: "כהן" });
    const code = await codeAt();
    const [row] = await db.select().from(customerLoginCode);
    expect(row.codeHash).not.toContain(code);
    const [msg] = await db.select().from(notification).where(eq(notification.templateKey, "auth.otp"));
    expect(msg.toE164).toBe("+972541234567");
    expect(msg.renderedBody).toContain(code);

    const ok = await verifyLoginCode(db, { phone: "+972541234567", code, secret, now: at(60) });
    expect(ok).toMatchObject({ ok: true, phoneE164: "+972541234567" });
    expect(ok.ok && ok.customerId).toBeTruthy();
    expect((await db.select().from(customer))[0].phoneVerifiedAt).not.toBeNull();
    expect(await verifyLoginCode(db, { phone, code, secret, now: at(61) })).toEqual({ ok: false, problem: { key: "NO_CODE" } });
  });

  it("counts wrong tries down and locks the code after five", async () => {
    const code = await codeAt();
    const wrong = code === "000000" ? "111111" : "000000";
    for (let left = 4; left >= 1; left--) {
      expect(await verifyLoginCode(db, { phone, code: wrong, secret, now: at(10) })).toEqual({ ok: false, problem: { key: "WRONG_CODE", attemptsLeft: left } });
    }
    expect(await verifyLoginCode(db, { phone, code: wrong, secret, now: at(10) })).toEqual({ ok: false, problem: { key: "TOO_MANY_ATTEMPTS" } });
    // Even the right code no longer works: ask for a new one.
    expect(await verifyLoginCode(db, { phone, code, secret, now: at(11) })).toEqual({ ok: false, problem: { key: "TOO_MANY_ATTEMPTS" } });
  });

  it("expires after five minutes, and only the newest code counts", async () => {
    const first = await codeAt(0);
    expect(await verifyLoginCode(db, { phone, code: first, secret, now: at(301) })).toEqual({ ok: false, problem: { key: "EXPIRED" } });
    const second = await codeAt(302);
    if (first !== second) expect((await verifyLoginCode(db, { phone, code: first, secret, now: at(303) })).ok).toBe(false);
    expect((await verifyLoginCode(db, { phone, code: second, secret, now: at(304) })).ok).toBe(true);
  });

  it("rate-limits requests per phone and says how long to wait", async () => {
    await codeAt(0);
    expect(await requestLoginCode(db, { phone, locale: "he", secret, demo: true, now: at(5) })).toEqual({ ok: false, problem: { key: "WAIT", retryAfterSeconds: 25 } });
    await codeAt(30);
    await codeAt(60);
    expect(await requestLoginCode(db, { phone, locale: "he", secret, demo: true, now: at(120) })).toEqual({ ok: false, problem: { key: "WAIT", retryAfterSeconds: 780 } });
  });

  it("rejects landlines and never returns the code outside demo mode", async () => {
    expect(await requestLoginCode(db, { phone: "03-5123456", locale: "he", secret, demo: true, now: at(0) })).toEqual({ ok: false, problem: { key: "PHONE_NOT_MOBILE" } });
    const real = await requestLoginCode(db, { phone, locale: "he", secret, demo: false, now: at(0) });
    expect(real).toMatchObject({ ok: true, demoCode: null });
  });

  it("masks the code in the message log once sent, and won't resend it", async () => {
    const code = await codeAt();
    await dispatchQueued(db, { name: "MOCK", channel: "WHATSAPP", demo: true, send: async () => ({ ok: false, reason: "provider down", permanent: false }) });
    const [msg] = await db.select().from(notification);
    expect(msg.status).toBe("FAILED");
    expect(msg.renderedBody).not.toContain(code);
    expect(msg.templateParams).toEqual(["••••••"]);
    expect(await requeue(db, msg.id)).toBe(false);
  });
});
