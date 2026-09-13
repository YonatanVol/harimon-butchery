import { and, eq, gte, sql } from "drizzle-orm";
import { israelDateOf, toIsoDate } from "@/domain/delivery/israelTime";
import type { ShopLocation } from "@/domain/delivery/jewishCalendar";
import { type PlannedSlot, planSlots } from "@/domain/delivery/slots";
import type * as schema from "../db/schema";
import { calendarBlackout, deliverySlot, deliverySlotTemplate, deliveryZone, setting } from "../db/schema";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

type Database = PostgresJsDatabase<typeof schema>;

export async function shopSettings(db: Database) {
  const rows = await db.select().from(setting);
  const get = <T>(key: string, fallback: T) => (rows.find((r) => r.key === key)?.value as T) ?? fallback;
  const location = get<ShopLocation>("shop.location", { latitude: 32.0853, longitude: 34.7818 });
  return {
    shop: { latitude: location.latitude, longitude: location.longitude },
    erevBufferMinutes: get<number>("delivery.erevShabbatBufferMinutes", 180),
  };
}

/** Which windows the templates, the Jewish calendar and manual blackouts call for over the next `days` days. Writes nothing. */
export async function planWindows(db: Database, { days = 84, now = new Date() } = {}) {
  const { shop, erevBufferMinutes } = await shopSettings(db);
  const from = israelDateOf(now);

  const templates = await db
    .select({
      id: deliverySlotTemplate.id,
      zoneId: deliverySlotTemplate.zoneId,
      weekday: deliverySlotTemplate.weekday,
      startTime: deliverySlotTemplate.startTime,
      endTime: deliverySlotTemplate.endTime,
      capacityOrders: deliverySlotTemplate.capacityOrders,
      capacityWeightG: deliverySlotTemplate.capacityWeightG,
      cutoffLeadMinutes: deliverySlotTemplate.cutoffLeadMinutes,
    })
    .from(deliverySlotTemplate)
    .innerJoin(deliveryZone, eq(deliveryZone.id, deliverySlotTemplate.zoneId))
    .where(and(eq(deliverySlotTemplate.active, true), eq(deliveryZone.active, true)));

  const blackouts = await db
    .select()
    .from(calendarBlackout)
    .where(and(eq(calendarBlackout.source, "MANUAL"), gte(calendarBlackout.date, toIsoDate(from))));

  return planSlots({
    templates,
    from,
    days,
    shop,
    erevBufferMinutes,
    manualBlackouts: blackouts.map((b) => ({
      date: b.date,
      fromTime: b.fromTime,
      toTime: b.toTime,
      zoneId: b.zoneId,
      reasonHe: b.reasonHe,
      reasonEn: b.reasonEn,
    })),
  });
}

/**
 * Writes planned windows. Idempotent: existing windows keep their reservations and capacity; only their
 * open/closed state and reason are refreshed.
 */
export async function applyWindows(db: Database, planned: PlannedSlot[]) {
  const chunk = 500;
  for (let i = 0; i < planned.length; i += chunk) {
    const rows = planned.slice(i, i + chunk).map((s) => ({
      zoneId: s.zoneId,
      templateId: s.templateId,
      serviceDate: s.serviceDate,
      startsAt: s.startsAt,
      endsAt: s.endsAt,
      cutoffAt: s.cutoffAt,
      capacityOrders: s.capacityOrders,
      capacityWeightG: s.capacityWeightG,
      status: s.status,
      blackoutReasonHe: s.reasonHe,
      blackoutReasonEn: s.reasonEn,
      hebrewDateHe: s.hebrewDateHe,
    }));
    await db
      .insert(deliverySlot)
      .values(rows)
      .onConflictDoUpdate({
        target: [deliverySlot.zoneId, deliverySlot.startsAt],
        set: {
          status: sql`excluded.status`,
          blackoutReasonHe: sql`excluded.blackout_reason_he`,
          blackoutReasonEn: sql`excluded.blackout_reason_en`,
          hebrewDateHe: sql`excluded.hebrew_date_he`,
          cutoffAt: sql`excluded.cutoff_at`,
        },
      });
  }
  return { planned: planned.length, open: planned.filter((s) => s.status === "OPEN").length };
}

/** Materializes delivery windows for the next `days` days. */
export async function generateSlots(db: Database, { days = 84, now = new Date() } = {}) {
  return applyWindows(db, await planWindows(db, { days, now }));
}
