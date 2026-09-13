import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { addDays, israelDateOf, toIsoDate } from "@/domain/delivery/israelTime";
import { deliverySlot, deliverySlotTemplate, deliveryZone, notification, order } from "@/infra/db/schema";
import { addBlackout, applyWindowPlan, previewWindows, removeBlackout, updateZone } from "@/infra/delivery/manage";
import { generateSlots } from "@/infra/delivery/generateSlots";
import { signUpForArea } from "@/infra/interest/signups";
import { createMockProvider } from "@/infra/payments/mock";
import { changeWindow, rescheduleOptions } from "@/infra/orders/customer";
import { connectTestDb, makeSlot, makeStaff, makeZone, truncateAll } from "./support/db";
import { APP, authorizedOrder } from "./support/orders";

const { db, close } = connectTestDb();
const provider = createMockProvider(db, APP);
beforeEach(() => truncateAll(db));
afterAll(() => close());

// A fixed Monday morning in Israel, so no Shabbat or holiday decides the outcome.
const NOW = new Date("2026-10-19T06:00:00Z");

async function zoneWithWeekdayWindows() {
  const zone = await makeZone(db);
  for (const weekday of [0, 1, 2, 3, 4]) {
    await db.insert(deliverySlotTemplate).values({ zoneId: zone.id, weekday, startTime: "10:00", endTime: "13:00", capacityOrders: 5, capacityWeightG: 75_000, cutoffLeadMinutes: 180 });
  }
  return zone;
}

describe("delivery windows", () => {
  it("previews a blackout: which open windows close, and which booked orders sit in them — before writing", async () => {
    const zone = await zoneWithWeekdayWindows();
    await generateSlots(db, { days: 14, now: NOW });
    const manager = await makeStaff(db, "MANAGER");
    const tuesday = toIsoDate(addDays(israelDateOf(NOW), 1));
    const [slot] = await db.select().from(deliverySlot).where(eq(deliverySlot.serviceDate, tuesday));
    const f = await authorizedOrder(db, provider);
    await db.update(order).set({ slotId: slot.id, zoneId: zone.id }).where(eq(order.id, f.orderId));

    expect((await addBlackout(db, { date: tuesday, fromTime: null, toTime: null, zoneId: zone.id, reasonHe: "", reasonEn: "", staff: manager })).ok).toBe(false);
    expect(await addBlackout(db, { date: tuesday, fromTime: "12:00", toTime: null, zoneId: zone.id, reasonHe: "חופש צוות", reasonEn: "", staff: manager })).toEqual({ ok: false, problem: { key: "INVALID_TIMES" } });
    const added = await addBlackout(db, { date: tuesday, fromTime: null, toTime: null, zoneId: zone.id, reasonHe: "חופש צוות", reasonEn: "Staff day off", staff: manager });
    expect(added.ok).toBe(true);

    const preview = await previewWindows(db, { days: 14, now: NOW });
    expect(preview.closing.map((c) => c.id)).toEqual([slot.id]);
    expect(preview.closing[0].newReasonHe).toBe("חופש צוות");
    expect(preview.affectedOrders.map((o) => o.orderNumber)).toEqual([f.order.orderNumber]);
    // Nothing written yet.
    expect((await db.select().from(deliverySlot).where(eq(deliverySlot.id, slot.id)))[0].status).toBe("OPEN");

    expect(await applyWindowPlan(db, { days: 14, staff: manager, now: NOW })).toMatchObject({ ok: true, closing: 1, affectedOrders: 1 });
    const closed = (await db.select().from(deliverySlot).where(eq(deliverySlot.id, slot.id)))[0];
    expect(closed).toMatchObject({ status: "BLACKOUT", blackoutReasonHe: "חופש צוות", reservedOrders: 0 });
    // The booked order stays where it is; moving it is a phone call, not a silent change.
    expect((await db.select().from(order).where(eq(order.id, f.orderId)))[0].slotId).toBe(slot.id);

    if (added.ok) expect(await removeBlackout(db, { id: added.id, staff: manager })).toEqual({ ok: true });
    expect((await previewWindows(db, { days: 14, now: NOW })).opening.map((o) => o.id)).toEqual([slot.id]);
  });

  it("only managers change windows", async () => {
    const packer = await makeStaff(db, "PACKER");
    expect(await addBlackout(db, { date: "2026-10-20", fromTime: null, toTime: null, zoneId: null, reasonHe: "חופש", reasonEn: "", staff: packer })).toEqual({ ok: false, problem: { key: "NOT_PERMITTED" } });
    expect(await applyWindowPlan(db, { staff: packer })).toEqual({ ok: false, problem: { key: "NOT_PERMITTED" } });
  });
});

describe("zones", () => {
  it("adding a city tells the people waiting for it, once, and a city can't sit in two zones", async () => {
    const tlv = await makeZone(db, { citiesHe: ["תל אביב"], citiesEn: ["Tel Aviv"] });
    const sharon = await makeZone(db, { nameHe: "השרון", nameEn: "Sharon", citiesHe: ["הרצליה"], citiesEn: ["Herzliya"] });
    const manager = await makeStaff(db, "MANAGER");
    await signUpForArea(db, { city: "רמת-השרון", phone: "054-123 4567", locale: "he" });
    const base = { zoneId: sharon.id, citiesEn: ["Herzliya"], deliveryFeeAgorot: 3500, freeDeliveryOverAgorot: 45_000, minOrderAgorot: 22_000, active: true, staff: manager, appUrl: APP };

    expect(await updateZone(db, { ...base, citiesHe: ["הרצליה", "תל-אביב"] })).toEqual({ ok: false, problem: { key: "CITY_IN_OTHER_ZONE", city: "תל-אביב", zoneHe: tlv.nameHe, zoneEn: tlv.nameEn } });
    expect(await updateZone(db, { ...base, citiesHe: [" "] })).toEqual({ ok: false, problem: { key: "CITIES_REQUIRED" } });
    expect(await updateZone(db, { ...base, citiesHe: ["הרצליה", "רמת השרון"] })).toEqual({ ok: true, notified: 1 });
    expect(await updateZone(db, { ...base, citiesHe: ["הרצליה", "רמת השרון"], deliveryFeeAgorot: 3000 })).toEqual({ ok: true, notified: 0 });
    expect(await db.select().from(notification)).toHaveLength(1);
    expect((await db.select().from(deliveryZone).where(eq(deliveryZone.id, sharon.id)))[0]).toMatchObject({ citiesHe: ["הרצליה", "רמת השרון"], deliveryFeeAgorot: 3000 });
  });

  it("switching a zone on counts as opening all its cities", async () => {
    const paused = await makeZone(db, { nameHe: "אילת", nameEn: "Eilat", citiesHe: ["אילת"], citiesEn: ["Eilat"], active: false });
    const manager = await makeStaff(db, "MANAGER");
    await signUpForArea(db, { city: "Eilat", phone: "054-123 4567", locale: "en" });
    expect(await updateZone(db, { zoneId: paused.id, citiesHe: ["אילת"], citiesEn: ["Eilat"], deliveryFeeAgorot: 9000, freeDeliveryOverAgorot: null, minOrderAgorot: 50_000, active: true, staff: manager, appUrl: APP })).toEqual({ ok: true, notified: 1 });
  });
});

describe("moving an order before it leaves the shop", () => {
  it("a manager moves an order out of a closed window; the customer is told; the board stops flagging it", async () => {
    const f = await authorizedOrder(db, provider);
    const manager = await makeStaff(db, "MANAGER");
    const driver = await makeStaff(db, "DRIVER");
    await db.update(deliverySlot).set({ status: "BLACKOUT", blackoutReasonHe: "חופש צוות" }).where(eq(deliverySlot.id, f.slot.id));
    const { loadAlerts } = await import("@/infra/staff/board");
    expect((await loadAlerts()).filter((a) => a.key === "WINDOW_CLOSED")).toHaveLength(1);

    const later = await makeSlot(db, f.zone.id, { startsAt: new Date(Date.now() + 72 * 3_600_000), endsAt: new Date(Date.now() + 75 * 3_600_000), cutoffAt: new Date(Date.now() + 70 * 3_600_000) });
    expect(await changeWindow(db, { orderId: f.orderId, slotId: later.id, staff: driver, appUrl: APP })).toEqual({ ok: false, problem: { key: "NOT_PERMITTED" } });
    expect(await changeWindow(db, { orderId: f.orderId, slotId: later.id, staff: manager, appUrl: APP })).toEqual({ ok: true });

    expect((await db.select().from(order).where(eq(order.id, f.orderId)))[0].slotId).toBe(later.id);
    expect((await db.select().from(deliverySlot).where(eq(deliverySlot.id, later.id)))[0].reservedOrders).toBe(1);
    expect((await db.select().from(deliverySlot).where(eq(deliverySlot.id, f.slot.id)))[0].reservedOrders).toBe(0);
    const [msg] = await db.select().from(notification).where(eq(notification.templateKey, "order.rescheduled"));
    expect(msg.renderedBody).toContain(f.order.orderNumber);
    expect((await loadAlerts()).filter((a) => a.key === "WINDOW_CLOSED")).toHaveLength(0);
  });

  it("once the meat is cut, only windows inside the cold-chain limit are allowed", async () => {
    const f = await authorizedOrder(db, provider);
    const manager = await makeStaff(db, "MANAGER");
    await db.update(order).set({ weighedAt: new Date() }).where(eq(order.id, f.orderId));
    const tooLate = await makeSlot(db, f.zone.id, { startsAt: new Date(Date.now() + 24 * 3_600_000), endsAt: new Date(Date.now() + 27 * 3_600_000), cutoffAt: new Date(Date.now() + 20 * 3_600_000) });
    expect(await changeWindow(db, { orderId: f.orderId, slotId: tooLate.id, staff: manager, appUrl: APP })).toEqual({ ok: false, problem: { key: "COLD_CHAIN_EXCEEDED" } });
    expect((await rescheduleOptions(db, { zoneId: f.zone.id, slotId: f.slot.id, cutAt: new Date() })).map((w) => w.id)).not.toContain(tooLate.id);
  });
});
