import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { Notifier } from "@/domain/notifications/notifier";
import { customer, notification, notificationSuppression } from "@/infra/db/schema";
import { dispatchQueued, requeue } from "@/infra/notify/dispatch";
import { mockNotifier } from "@/infra/notify/providers";
import { connectTestDb, truncateAll } from "./support/db";

const { db, close } = connectTestDb();
beforeEach(() => truncateAll(db));
afterAll(() => close());

async function queued(count = 1, phone = "+972541234567") {
  const [c] = await db.insert(customer).values({ phoneE164: phone, firstName: "דנה", lastName: "כהן" }).returning();
  const rows = await db
    .insert(notification)
    .values(
      Array.from({ length: count }, (_, i) => ({
        customerId: c.id,
        templateKey: "order.packed",
        channel: "WHATSAPP" as const,
        provider: "MOCK" as const,
        toE164: phone,
        locale: "he",
        renderedBody: `ההזמנה ${i} ארוזה`,
        templateParams: [String(i)],
        idempotencyKey: `k${i}-${phone}`,
      })),
    )
    .returning();
  return { customer: c, rows };
}

describe("notification dispatch (real Postgres)", () => {
  it("demo mode records messages as sent by the demo provider", async () => {
    const { rows } = await queued(3);
    expect(await dispatchQueued(db, mockNotifier)).toEqual({ sent: 3 });
    const after = await db.select().from(notification);
    expect(after.every((n) => n.status === "SENT" && n.provider === "MOCK" && n.providerMessageId?.startsWith("demo_"))).toBe(true);
    expect(after.map((n) => n.id).sort()).toEqual(rows.map((r) => r.id).sort());
  });

  it("two workers at once never send the same message twice", async () => {
    await queued(20);
    const calls: string[] = [];
    const counting: Notifier = { ...mockNotifier, send: async (m) => (calls.push(m.notificationId), { ok: true, providerMessageId: m.notificationId }) };
    const [a, b] = await Promise.all([dispatchQueued(db, counting), dispatchQueued(db, counting)]);
    expect(a.sent + b.sent).toBe(20);
    expect(new Set(calls).size).toBe(20);
    expect(calls).toHaveLength(20);
  });

  it("a suppressed customer is not messaged, and the row says why", async () => {
    const { customer: c } = await queued(1);
    await db.insert(notificationSuppression).values({ customerId: c.id, channel: "WHATSAPP", reason: "OPT_OUT" });
    await dispatchQueued(db, mockNotifier);
    expect((await db.select().from(notification))[0]).toMatchObject({ status: "SUPPRESSED", failureReason: "OPT_OUT" });
  });

  it("a provider failure is recorded with its reason and can be sent again", async () => {
    await queued(1);
    const failing: Notifier = { ...mockNotifier, name: "INFORU", channel: "SMS", demo: false, send: async () => ({ ok: false, reason: "Bad credentials", permanent: false }) };
    await dispatchQueued(db, failing);
    const [row] = await db.select().from(notification);
    expect(row).toMatchObject({ status: "FAILED", provider: "INFORU", channel: "SMS", failureReason: "Bad credentials" });
    expect(await requeue(db, row.id)).toBe(true);
    await dispatchQueued(db, mockNotifier);
    expect((await db.select().from(notification).where(eq(notification.id, row.id)))[0].status).toBe("SENT");
  });
});
