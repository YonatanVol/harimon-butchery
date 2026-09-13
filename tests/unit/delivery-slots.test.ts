import { flags, getHolidaysOnDate, HDate, HebrewCalendar, isAssurBemlacha, Location } from "@hebcal/core";
import { describe, expect, it } from "vitest";
import { addDays, type CivilDate, israelDateOf, israelInstant, toIsoDate, weekdayOf } from "@/domain/delivery/israelTime";
import { dayContext } from "@/domain/delivery/jewishCalendar";
import { closedDayReason, planSlots, type SlotTemplate, slotAvailability } from "@/domain/delivery/slots";

const JERUSALEM = { latitude: 31.7683, longitude: 35.2137 };
const TEL_AVIV = { latitude: 32.0853, longitude: 34.7818 };
const BUFFER = 180;

const hours: Array<[string, string]> = [
  ["08:00", "11:00"],
  ["11:00", "14:00"],
  ["14:00", "17:00"],
  ["17:00", "20:00"],
];
const friday: Array<[string, string]> = [
  ["08:00", "10:00"],
  ["10:00", "12:00"],
  ["12:00", "14:00"],
];
const templates: SlotTemplate[] = [
  ...[0, 1, 2, 3, 4].flatMap((weekday) =>
    hours.map(([s, e], i) => ({ id: `t${weekday}${i}`, zoneId: "z", weekday, startTime: s, endTime: e, capacityOrders: 8, capacityWeightG: 120_000, cutoffLeadMinutes: 180 })),
  ),
  ...friday.map(([s, e], i) => ({ id: `t5${i}`, zoneId: "z", weekday: 5, startTime: s, endTime: e, capacityOrders: 8, capacityWeightG: 120_000, cutoffLeadMinutes: 180 })),
];

/** An independent oracle, straight from hebcal, not via our code. */
function candleLightingOn(date: CivilDate, shop: { latitude: number; longitude: number }): Date | null {
  const loc = new Location(shop.latitude, shop.longitude, true, "Asia/Jerusalem");
  const hd = new HDate(new Date(date.y, date.m - 1, date.d));
  const ev = HebrewCalendar.calendar({ start: hd, end: hd, candlelighting: true, location: loc, il: true }).find(
    (e) => e.getDesc() === "Candle lighting",
  );
  return ev ? (ev as unknown as { eventTime: Date }).eventTime : null;
}

describe("Israel time, independent of the server time zone", () => {
  it("converts wall-clock time in summer (UTC+3) and winter (UTC+2)", () => {
    expect(israelInstant({ y: 2026, m: 9, d: 18 }, 10, 0).toISOString()).toBe("2026-09-18T07:00:00.000Z");
    expect(israelInstant({ y: 2026, m: 12, d: 18 }, 10, 0).toISOString()).toBe("2026-12-18T08:00:00.000Z");
  });

  it("reads the Israeli civil date of an instant near midnight", () => {
    expect(israelDateOf(new Date("2026-09-17T22:30:00Z"))).toEqual({ y: 2026, m: 9, d: 18 });
  });

  it("walks days and weekdays", () => {
    expect(addDays({ y: 2026, m: 12, d: 31 }, 1)).toEqual({ y: 2027, m: 1, d: 1 });
    expect(weekdayOf({ y: 2026, m: 9, d: 18 })).toBe(5);
  });
});

describe("day context (5787)", () => {
  it("Erev Rosh Hashana: candles at 18:32 in Tel Aviv, eve of Rosh Hashana", () => {
    const ctx = dayContext({ y: 2026, m: 9, d: 11 }, TEL_AVIV);
    expect(ctx.candleLighting?.toISOString()).toBe("2026-09-11T15:32:00.000Z");
    expect(ctx.erevOfHe).toContain("ראש השנה");
  });

  it("Rosh Hashana II is a closed day with a Hebrew reason", () => {
    const reason = closedDayReason(dayContext({ y: 2026, m: 9, d: 13 }, TEL_AVIV));
    expect(reason?.key).toBe("CHAG");
    expect(reason?.he).toContain("ראש השנה");
  });

  it("an ordinary Friday is the eve of Shabbat", () => {
    const ctx = dayContext({ y: 2026, m: 10, d: 16 }, TEL_AVIV);
    expect(ctx.erevOfHe).toBe("שבת");
    expect(ctx.candleLighting).not.toBeNull();
  });

  it("renders the Hebrew date", () => {
    expect(dayContext({ y: 2026, m: 9, d: 13 }, TEL_AVIV).hebrewDateHe).toBe("ב׳ תשרי תשפ״ז");
  });
});

describe("slot planning — a full Hebrew year for Jerusalem", () => {
  const from: CivilDate = { y: 2026, m: 9, d: 12 }; // 1 Tishrei 5787
  const slots = planSlots({ templates, from, days: 385, shop: JERUSALEM, erevBufferMinutes: BUFFER });
  const open = slots.filter((s) => s.status === "OPEN");
  const loc = new Location(JERUSALEM.latitude, JERUSALEM.longitude, true, "Asia/Jerusalem");

  it("produces one slot per template per matching day", () => {
    let expected = 0;
    for (let i = 0; i < 385; i++) expected += templates.filter((t) => t.weekday === weekdayOf(addDays(from, i))).length;
    expect(slots.length).toBe(expected);
    // Most weekday windows stay open; holidays and early closes take the rest.
    expect(open.length / slots.length).toBeGreaterThan(0.85);
  });

  it("no open slot on Shabbat", () => {
    expect(open.filter((s) => weekdayOf(israelDateOf(s.startsAt)) === 6)).toEqual([]);
  });

  it("no open slot on any Yom Tov (checked against hebcal directly)", () => {
    const offending = open.filter((s) => {
      const d = israelDateOf(s.startsAt);
      const hol = getHolidaysOnDate(new HDate(new Date(d.y, d.m - 1, d.d)), true) ?? [];
      return hol.some((h) => h.getFlags() & flags.CHAG);
    });
    expect(offending.map((s) => s.serviceDate)).toEqual([]);
  });

  it("no open slot overlaps a time when work is forbidden", () => {
    const offending = open.filter(
      (s) => isAssurBemlacha(s.startsAt, loc, false) || isAssurBemlacha(new Date(s.endsAt.getTime() - 60000), loc, false),
    );
    expect(offending.map((s) => s.serviceDate)).toEqual([]);
  });

  it("every open slot on an eve ends at least 3 hours before candle lighting", () => {
    const offending = open.filter((s) => {
      const candles = candleLightingOn(israelDateOf(s.startsAt), JERUSALEM);
      return candles !== null && s.endsAt.getTime() > candles.getTime() - BUFFER * 60000;
    });
    expect(offending.map((s) => s.serviceDate)).toEqual([]);
  });

  it("Yom Kippur (21 Sep 2026) and Sukkot I (26 Sep, Shabbat) have no open slots; Sukkot I weekday templates don't exist", () => {
    expect(open.filter((s) => s.serviceDate === "2026-09-21")).toEqual([]);
    const yk = slots.filter((s) => s.serviceDate === "2026-09-21");
    expect(yk).toHaveLength(4);
    expect(yk.every((s) => s.reasonHe?.includes("יום כיפור"))).toBe(true);
  });

  it("Erev Yom Kippur (Sunday 20 Sep): morning open, afternoon closed early with the candle time", () => {
    const day = slots.filter((s) => s.serviceDate === "2026-09-20");
    expect(day.map((s) => s.status)).toEqual(["OPEN", "OPEN", "BLACKOUT", "BLACKOUT"]);
    expect(day[2].reasonKey).toBe("EARLY_CLOSE");
    expect(day[2].reasonHe).toMatch(/הדלקת נרות \d\d:\d\d/);
    expect(day[2].reasonHe).toContain("ערב יום כיפור");
    expect(day[3].reasonKey).toBe("EARLY_CLOSE");
  });

  it("chol hamoed Sukkot (Tuesday 29 Sep) is open", () => {
    expect(open.filter((s) => s.serviceDate === "2026-09-29")).toHaveLength(4);
  });

  it("a December Friday closes the 12:00–14:00 window; a June Friday keeps all three", () => {
    const dec = slots.filter((s) => s.serviceDate === "2026-12-18").map((s) => s.status);
    const jun = slots.filter((s) => s.serviceDate === "2027-06-18").map((s) => s.status);
    expect(dec).toEqual(["OPEN", "OPEN", "BLACKOUT"]);
    expect(jun).toEqual(["OPEN", "OPEN", "OPEN"]);
  });

  it("the first day of Pesach has no open slots, and its eve closes early", () => {
    const pesach = new HDate(15, "Nisan", 5787).greg();
    const pesachIso = toIsoDate({ y: pesach.getFullYear(), m: pesach.getMonth() + 1, d: pesach.getDate() });
    const erev = toIsoDate(addDays({ y: pesach.getFullYear(), m: pesach.getMonth() + 1, d: pesach.getDate() }, -1));
    expect(open.filter((s) => s.serviceDate === pesachIso)).toEqual([]);
    const erevSlots = slots.filter((s) => s.serviceDate === erev);
    if (erevSlots.length) expect(erevSlots.some((s) => s.reasonKey === "EARLY_CLOSE")).toBe(true);
  });

  it("closes Shabbat even if someone configures a Saturday template by mistake", () => {
    const planned = planSlots({
      templates: [{ ...templates[0], id: "sat", weekday: 6, startTime: "10:00", endTime: "13:00" }],
      from: { y: 2026, m: 10, d: 10 }, // an ordinary Shabbat
      days: 7,
      shop: JERUSALEM,
      erevBufferMinutes: BUFFER,
    });
    expect(planned).toHaveLength(1);
    expect(planned[0]).toMatchObject({ status: "BLACKOUT", reasonKey: "SHABBAT", reasonHe: "שבת — אין משלוחים" });
  });

  it("applies a manual blackout for one zone and time window only", () => {
    const planned = planSlots({
      templates,
      from: { y: 2026, m: 10, d: 5 },
      days: 1,
      shop: JERUSALEM,
      erevBufferMinutes: BUFFER,
      manualBlackouts: [{ date: "2026-10-05", fromTime: "12:00", toTime: "15:00", zoneId: "z", reasonHe: "ספירת מלאי", reasonEn: "Stock count" }],
    });
    expect(planned.map((s) => s.status)).toEqual(["OPEN", "BLACKOUT", "BLACKOUT", "OPEN"]);
    expect(planned[1].reasonHe).toBe("ספירת מלאי");
  });
});

describe("slot availability for a customer", () => {
  const base = {
    status: "OPEN" as const,
    startsAt: new Date("2026-10-05T14:00:00Z"),
    cutoffAt: new Date("2026-10-05T11:00:00Z"),
    capacityOrders: 3,
    reservedOrders: 1,
    activeHolds: 1,
    reasonHe: null,
    reasonEn: null,
  };

  it("counts reserved orders and other carts' holds", () => {
    expect(slotAvailability(base, new Date("2026-10-05T06:00:00Z"), 180)).toEqual({ kind: "AVAILABLE", remainingOrders: 1 });
    expect(slotAvailability({ ...base, activeHolds: 2 }, new Date("2026-10-05T06:00:00Z"), 180)).toEqual({ kind: "FULL" });
  });

  it("explains cutoff, lead time and closures", () => {
    expect(slotAvailability(base, new Date("2026-10-05T11:00:00Z"), 60).kind).toBe("PAST_CUTOFF");
    expect(slotAvailability(base, new Date("2026-10-05T10:00:00Z"), 300)).toEqual({ kind: "TOO_SOON", leadMinutes: 300 });
    expect(slotAvailability({ ...base, status: "BLACKOUT", reasonHe: "שבת — אין משלוחים", reasonEn: "Shabbat" }, new Date("2026-10-01T00:00:00Z"), 60)).toEqual({
      kind: "CLOSED",
      reasonHe: "שבת — אין משלוחים",
      reasonEn: "Shabbat",
    });
  });
});
