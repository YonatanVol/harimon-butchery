import "server-only";
import { and, asc, eq, gt, lt, sql } from "drizzle-orm";
import { israelDateOf } from "@/domain/delivery/israelTime";
import { dayContext } from "@/domain/delivery/jewishCalendar";
import { closedDayReason } from "@/domain/delivery/slots";
import { db } from "../db/client";
import { deliverySlot, deliveryZone, setting } from "../db/schema";

/** For the home page: today's status and the next window a customer can still order for. */
export async function nextDeliveryForDefaultZone(now = new Date()) {
  const [zone] = await db.select().from(deliveryZone).where(eq(deliveryZone.active, true)).orderBy(asc(deliveryZone.sortOrder)).limit(1);
  if (!zone) return null;

  const [slot] = await db
    .select()
    .from(deliverySlot)
    .where(
      and(
        eq(deliverySlot.zoneId, zone.id),
        eq(deliverySlot.status, "OPEN"),
        gt(deliverySlot.cutoffAt, now),
        gt(deliverySlot.startsAt, new Date(now.getTime() + zone.leadTimeMinutes * 60000)),
        lt(deliverySlot.reservedOrders, deliverySlot.capacityOrders),
        lt(deliverySlot.startsAt, sql`${now.toISOString()}::timestamptz + interval '10 days'`),
      ),
    )
    .orderBy(asc(deliverySlot.startsAt))
    .limit(1);

  const [loc] = await db.select().from(setting).where(eq(setting.key, "shop.location"));
  const shop = (loc?.value ?? { latitude: 32.0853, longitude: 34.7818 }) as { latitude: number; longitude: number };
  const today = closedDayReason(dayContext(israelDateOf(now), shop));

  return {
    zoneNameHe: zone.nameHe,
    zoneNameEn: zone.nameEn,
    todayClosed: today ? { he: today.he, en: today.en } : null,
    next: slot ? { startsAt: slot.startsAt, endsAt: slot.endsAt, cutoffAt: slot.cutoffAt } : null,
  };
}
