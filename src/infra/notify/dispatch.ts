import { and, asc, eq, ne, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { maskCode } from "@/domain/auth/otp";
import type { Notifier } from "@/domain/notifications/notifier";
import type * as schema from "../db/schema";
import { notification, notificationSuppression } from "../db/schema";

type Database = NodePgDatabase<typeof schema>;

/**
 * Sends queued messages, one row at a time under a skip-locked lock so two workers never send the
 * same message twice. Suppressed customers (opted out, invalid number) are marked, never sent.
 */
export async function dispatchQueued(db: Database, notifier: Notifier, { limit = 50, now = () => new Date() } = {}) {
  let sent = 0;
  for (let i = 0; i < limit; i++) {
    const done = await db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(notification)
        .where(eq(notification.status, "QUEUED"))
        .orderBy(asc(notification.queuedAt))
        .limit(1)
        .for("update", { skipLocked: true });
      if (!row) return false;

      if (row.customerId) {
        const [suppressed] = await tx
          .select()
          .from(notificationSuppression)
          .where(and(eq(notificationSuppression.customerId, row.customerId), eq(notificationSuppression.channel, notifier.channel)));
        if (suppressed) {
          await tx.update(notification).set({ status: "SUPPRESSED", failureReason: suppressed.reason }).where(eq(notification.id, row.id));
          return true;
        }
      }

      const result = await notifier.send({
        notificationId: row.id,
        channel: notifier.channel,
        toE164: row.toE164,
        locale: row.locale === "en" ? "en" : "he",
        templateKey: row.templateKey,
        body: row.renderedBody,
        templateParams: (row.templateParams as string[] | null) ?? [],
      });

      // A login code is useful to an attacker for 5 minutes and to nobody after: never keep it readable.
      const redact = row.templateKey === "auth.otp" ? { renderedBody: maskCode(row.renderedBody), templateParams: ((row.templateParams as string[] | null) ?? []).map(maskCode) } : {};
      await tx
        .update(notification)
        .set(
          result.ok
            ? { ...redact, status: "SENT", provider: notifier.name, channel: notifier.channel, providerMessageId: result.providerMessageId, sentAt: now(), failureReason: null }
            : { ...redact, status: "FAILED", provider: notifier.name, channel: notifier.channel, failureReason: result.reason },
        )
        .where(eq(notification.id, row.id));
      if (result.ok) sent++;
      return true;
    });
    if (!done) break;
  }
  return { sent };
}

/** Put a failed message back in the queue (the "send again" button). */
export async function requeue(db: Database, notificationId: string) {
  const r = await db
    .update(notification)
    .set({ status: "QUEUED", failureReason: null })
    // A failed login code is not resent: it has been masked, and the customer simply asks for a new one.
    .where(and(eq(notification.id, notificationId), sql`${notification.status} in ('FAILED')`, ne(notification.templateKey, "auth.otp")))
    .returning({ id: notification.id });
  return r.length === 1;
}
