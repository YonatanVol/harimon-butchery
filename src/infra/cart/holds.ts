import { and, eq, gt, isNull, ne, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { slotAvailability } from "@/domain/delivery/slots";
import type * as schema from "../db/schema";
import { deliverySlot, deliveryZone, slotHold } from "../db/schema";

type Database = PostgresJsDatabase<typeof schema>;

export const HOLD_MINUTES = 15;

export type HoldProblem =
  | { key: "INVALID_INPUT" }
  | { key: "SLOT_WRONG_ZONE" }
  | { key: "SLOT_CLOSED"; reasonHe: string; reasonEn: string }
  | { key: "SLOT_FULL" }
  | { key: "SLOT_PAST_CUTOFF" }
  | { key: "SLOT_TOO_SOON"; leadMinutes: number };

/**
 * Holds a delivery window for a cart for 15 minutes. The slot row is locked for the duration of
 * the check, so concurrent customers can never together hold more windows than the slot has room for.
 */
export async function holdSlotForCart(
  db: Database,
  { cartId, zoneId, slotId, now = new Date() }: { cartId: string; zoneId: string; slotId: string; now?: Date },
): Promise<{ ok: true; expiresAt: Date } | { ok: false; problem: HoldProblem }> {
  return db.transaction(async (tx) => {
    const [slot] = await tx.select().from(deliverySlot).where(eq(deliverySlot.id, slotId)).for("update");
    if (!slot) return { ok: false, problem: { key: "INVALID_INPUT" } };
    if (slot.zoneId !== zoneId) return { ok: false, problem: { key: "SLOT_WRONG_ZONE" } };

    const [{ holds }] = await tx
      .select({ holds: sql<number>`count(*)::int` })
      .from(slotHold)
      .where(and(eq(slotHold.slotId, slotId), isNull(slotHold.releasedAt), gt(slotHold.expiresAt, now), ne(slotHold.cartId, cartId)));
    const [zone] = await tx.select().from(deliveryZone).where(eq(deliveryZone.id, slot.zoneId));

    const availability = slotAvailability(
      {
        status: slot.status,
        startsAt: slot.startsAt,
        cutoffAt: slot.cutoffAt,
        capacityOrders: slot.capacityOrders,
        reservedOrders: slot.reservedOrders,
        activeHolds: holds,
        reasonHe: slot.blackoutReasonHe,
        reasonEn: slot.blackoutReasonEn,
      },
      now,
      zone.leadTimeMinutes,
    );
    switch (availability.kind) {
      case "CLOSED":
        return { ok: false, problem: { key: "SLOT_CLOSED", reasonHe: availability.reasonHe, reasonEn: availability.reasonEn } };
      case "FULL":
        return { ok: false, problem: { key: "SLOT_FULL" } };
      case "PAST_CUTOFF":
        return { ok: false, problem: { key: "SLOT_PAST_CUTOFF" } };
      case "TOO_SOON":
        return { ok: false, problem: { key: "SLOT_TOO_SOON", leadMinutes: availability.leadMinutes } };
    }

    await tx.update(slotHold).set({ releasedAt: now }).where(and(eq(slotHold.cartId, cartId), isNull(slotHold.releasedAt)));
    const expiresAt = new Date(now.getTime() + HOLD_MINUTES * 60000);
    await tx.insert(slotHold).values({ slotId, cartId, weightG: 0, expiresAt });
    return { ok: true, expiresAt };
  });
}
