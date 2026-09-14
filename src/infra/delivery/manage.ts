import { and, asc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { can, type StaffRole } from "@/domain/auth/permissions";
import { addDays, fromIsoDate, israelDateOf, toIsoDate } from "@/domain/delivery/israelTime";
import { normalizeCity } from "@/domain/delivery/zones";
import type * as schema from "../db/schema";
import { auditEvent, calendarBlackout, customer, deliverySlot, deliveryZone, order } from "../db/schema";
import { notifyAreaOpened } from "../interest/signups";
import { applyWindows, planWindows } from "./generateSlots";

type Database = NodePgDatabase<typeof schema>;
type Staff = { id: string; role: string };

export type SlotsProblem =
  | { key: "NOT_PERMITTED" }
  | { key: "NOT_FOUND" }
  | { key: "INVALID_DATE" }
  | { key: "INVALID_TIMES" }
  | { key: "REASON_REQUIRED" }
  | { key: "CITIES_REQUIRED" }
  | { key: "CITY_IN_OTHER_ZONE"; city: string; zoneHe: string; zoneEn: string }
  | { key: "INVALID_MONEY" };

const OPEN_ORDER_STATES = ["AUTHORIZED", "PICKING", "AWAITING_CUSTOMER_APPROVAL", "WEIGHED", "REPRICED", "CAPTURE_PENDING", "CAPTURED", "CAPTURE_FAILED", "PACKED", "RESCHEDULED", "AUTH_PENDING"] as const;

const deny = (staff: Staff) => !can(staff.role as StaffRole, "MANAGE_SLOTS");

/** A zone's week: every window with orders and kilos booked against capacity, and why a closed one is closed. */
export async function loadZoneWeek(db: Database, { zoneId, weekStart }: { zoneId: string; weekStart: string }) {
  const end = toIsoDate(addDays(fromIsoDate(weekStart), 7));
  const slots = await db
    .select()
    .from(deliverySlot)
    .where(and(eq(deliverySlot.zoneId, zoneId), gte(deliverySlot.serviceDate, weekStart), lt(deliverySlot.serviceDate, end)))
    .orderBy(asc(deliverySlot.startsAt));
  const blackouts = await db
    .select()
    .from(calendarBlackout)
    .where(and(eq(calendarBlackout.source, "MANUAL"), gte(calendarBlackout.date, weekStart), lt(calendarBlackout.date, end), sql`(${calendarBlackout.zoneId} is null or ${calendarBlackout.zoneId} = ${zoneId})`))
    .orderBy(asc(calendarBlackout.date));
  return { slots, blackouts };
}

/**
 * What regenerating the next weeks would change, before anything is written: new windows, windows that
 * would open or close, and — the part that matters — booked orders sitting in windows that would close.
 */
export async function previewWindows(db: Database, { days = 28, now = new Date() }: { days?: number; now?: Date } = {}) {
  const planned = await planWindows(db, { days, now });
  const from = toIsoDate(israelDateOf(now));
  const existing = await db.select().from(deliverySlot).where(gte(deliverySlot.serviceDate, from));
  const byKey = new Map(existing.map((s) => [`${s.zoneId}|${s.startsAt.toISOString()}`, s]));

  let added = 0;
  const opening: typeof existing = [];
  const closing: Array<(typeof existing)[number] & { newReasonHe: string | null; newReasonEn: string | null }> = [];
  for (const p of planned) {
    const current = byKey.get(`${p.zoneId}|${p.startsAt.toISOString()}`);
    if (!current) {
      added++;
      continue;
    }
    if (current.status !== "OPEN" && p.status === "OPEN") opening.push(current);
    if (current.status === "OPEN" && p.status !== "OPEN") closing.push({ ...current, newReasonHe: p.reasonHe, newReasonEn: p.reasonEn });
  }

  const closingIds = closing.map((c) => c.id);
  const affectedOrders = closingIds.length
    ? await db
        .select({ id: order.id, orderNumber: order.orderNumber, status: order.status, slotId: order.slotId, firstName: customer.firstName, lastName: customer.lastName, phone: customer.phoneE164 })
        .from(order)
        .innerJoin(customer, eq(customer.id, order.customerId))
        .where(and(inArray(order.slotId, closingIds), inArray(order.status, [...OPEN_ORDER_STATES])))
    : [];

  return { planned, added, opening, closing, affectedOrders };
}

/** Regenerate and write the next weeks' windows. Booked orders are never moved automatically. */
export async function applyWindowPlan(db: Database, { days = 28, staff, now = new Date() }: { days?: number; staff: Staff; now?: Date }) {
  if (deny(staff)) return { ok: false as const, problem: { key: "NOT_PERMITTED" } as SlotsProblem };
  const preview = await previewWindows(db, { days, now });
  const result = await applyWindows(db, preview.planned);
  await db.insert(auditEvent).values({
    actorType: "STAFF",
    actorId: staff.id,
    entityType: "delivery_slots",
    entityId: `${days}d`,
    action: "slots.generate",
    after: { added: preview.added, opening: preview.opening.length, closing: preview.closing.length, affectedOrders: preview.affectedOrders.map((o) => o.orderNumber) },
  });
  return { ok: true as const, ...result, added: preview.added, opening: preview.opening.length, closing: preview.closing.length, affectedOrders: preview.affectedOrders.length };
}

/** Close a day (or part of one) for one zone or all zones — a staff day off, a strike, a funeral. */
export async function addBlackout(
  db: Database,
  input: { date: string; fromTime: string | null; toTime: string | null; zoneId: string | null; reasonHe: string; reasonEn: string; staff: Staff },
): Promise<{ ok: true; id: string } | { ok: false; problem: SlotsProblem }> {
  if (deny(input.staff)) return { ok: false, problem: { key: "NOT_PERMITTED" } };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return { ok: false, problem: { key: "INVALID_DATE" } };
  const time = /^([01]\d|2[0-3]):[0-5]\d$/;
  if ((input.fromTime && !time.test(input.fromTime)) || (input.toTime && !time.test(input.toTime)) || Boolean(input.fromTime) !== Boolean(input.toTime) || (input.fromTime && input.toTime && input.fromTime >= input.toTime)) {
    return { ok: false, problem: { key: "INVALID_TIMES" } };
  }
  const reasonHe = input.reasonHe.trim().slice(0, 80);
  const reasonEn = input.reasonEn.trim().slice(0, 80) || reasonHe;
  if (reasonHe.length < 2) return { ok: false, problem: { key: "REASON_REQUIRED" } };
  if (input.zoneId) {
    const [zone] = await db.select({ id: deliveryZone.id }).from(deliveryZone).where(eq(deliveryZone.id, input.zoneId));
    if (!zone) return { ok: false, problem: { key: "NOT_FOUND" } };
  }
  const [row] = await db
    .insert(calendarBlackout)
    .values({ date: input.date, fromTime: input.fromTime, toTime: input.toTime, zoneId: input.zoneId, reasonHe, reasonEn, source: "MANUAL" })
    .returning({ id: calendarBlackout.id });
  await db.insert(auditEvent).values({ actorType: "STAFF", actorId: input.staff.id, entityType: "calendar_blackout", entityId: row.id, action: "blackout.add", after: { ...input, staff: undefined } });
  return { ok: true, id: row.id };
}

export async function removeBlackout(db: Database, { id, staff }: { id: string; staff: Staff }): Promise<{ ok: true } | { ok: false; problem: SlotsProblem }> {
  if (deny(staff)) return { ok: false, problem: { key: "NOT_PERMITTED" } };
  const [gone] = await db.delete(calendarBlackout).where(and(eq(calendarBlackout.id, id), eq(calendarBlackout.source, "MANUAL"))).returning();
  if (!gone) return { ok: false, problem: { key: "NOT_FOUND" } };
  await db.insert(auditEvent).values({ actorType: "STAFF", actorId: staff.id, entityType: "calendar_blackout", entityId: id, action: "blackout.remove", before: gone });
  return { ok: true };
}

/**
 * Edit a zone's cities, fees and minimum. Cities added (or a zone switched on) tell everyone who asked to
 * hear when we reach them. A city can belong to one zone only, or the cart couldn't know which fee applies.
 */
export async function updateZone(
  db: Database,
  input: {
    zoneId: string;
    citiesHe: string[];
    citiesEn: string[];
    deliveryFeeAgorot: number;
    freeDeliveryOverAgorot: number | null;
    minOrderAgorot: number;
    active: boolean;
    staff: Staff;
    appUrl: string;
    now?: Date;
  },
): Promise<{ ok: true; notified: number } | { ok: false; problem: SlotsProblem }> {
  if (deny(input.staff)) return { ok: false, problem: { key: "NOT_PERMITTED" } };
  const clean = (list: string[]) => [...new Map(list.map((c) => c.trim()).filter(Boolean).map((c) => [normalizeCity(c), c.slice(0, 60)])).values()];
  const citiesHe = clean(input.citiesHe);
  const citiesEn = clean(input.citiesEn);
  if (citiesHe.length === 0) return { ok: false, problem: { key: "CITIES_REQUIRED" } };
  const money = [input.deliveryFeeAgorot, input.minOrderAgorot, input.freeDeliveryOverAgorot ?? 0];
  if (money.some((m) => !Number.isSafeInteger(m) || m < 0 || m > 10_000_00)) return { ok: false, problem: { key: "INVALID_MONEY" } };

  return db.transaction(async (tx) => {
    const zones = await tx.select().from(deliveryZone).for("update");
    const zone = zones.find((z) => z.id === input.zoneId);
    if (!zone) return { ok: false as const, problem: { key: "NOT_FOUND" } as SlotsProblem };
    for (const other of zones.filter((z) => z.id !== zone.id)) {
      const taken = new Set([...other.citiesHe, ...other.citiesEn].map(normalizeCity));
      const clash = [...citiesHe, ...citiesEn].find((c) => taken.has(normalizeCity(c)));
      if (clash) return { ok: false as const, problem: { key: "CITY_IN_OTHER_ZONE", city: clash, zoneHe: other.nameHe, zoneEn: other.nameEn } as SlotsProblem };
    }

    const before = { citiesHe: zone.citiesHe, citiesEn: zone.citiesEn, fee: zone.deliveryFeeAgorot, freeOver: zone.freeDeliveryOverAgorot, minOrder: zone.minOrderAgorot, active: zone.active };
    await tx
      .update(deliveryZone)
      .set({ citiesHe, citiesEn, deliveryFeeAgorot: input.deliveryFeeAgorot, freeDeliveryOverAgorot: input.freeDeliveryOverAgorot, minOrderAgorot: input.minOrderAgorot, active: input.active })
      .where(eq(deliveryZone.id, zone.id));
    await tx.insert(auditEvent).values({
      actorType: "STAFF",
      actorId: input.staff.id,
      entityType: "delivery_zone",
      entityId: zone.id,
      action: "zone.update",
      before,
      after: { citiesHe, citiesEn, fee: input.deliveryFeeAgorot, freeOver: input.freeDeliveryOverAgorot, minOrder: input.minOrderAgorot, active: input.active },
    });

    const wasServed = new Set(zone.active ? [...zone.citiesHe, ...zone.citiesEn].map(normalizeCity) : []);
    const nowServed = input.active ? [...citiesHe, ...citiesEn] : [];
    const opened = nowServed.filter((c) => !wasServed.has(normalizeCity(c)));
    const notified = opened.length ? await notifyAreaOpened(tx, { cities: opened, appUrl: input.appUrl, now: input.now }) : 0;
    return { ok: true as const, notified };
  });
}
