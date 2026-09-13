import { flags, HDate, HebrewCalendar, isAssurBemlacha, Location } from "@hebcal/core";
import { addDays, type CivilDate, formatIsraelTime, ISRAEL_TZ, weekdayOf } from "./israelTime";

/**
 * In plain words: for any day, which parts of it are Shabbat or a holiday (no deliveries), and
 * when candles are lit if it is the eve of one. All the halachic time math comes from @hebcal/core.
 */

export interface ShopLocation {
  latitude: number;
  longitude: number;
}

export interface Holiday {
  nameHe: string;
  nameEn: string;
  chag: boolean;
  cholHamoed: boolean;
}

export interface DayContext {
  date: CivilDate;
  weekday: number;
  hebrewDateHe: string;
  holidays: Holiday[];
  /** Candle-lighting instant if this day is the eve of Shabbat or a Yom Tov. */
  candleLighting: Date | null;
  /** Name of what starts at candle lighting ("שבת", "יום כיפור"…), when known. */
  erevOfHe: string | null;
  erevOfEn: string | null;
}

const locationCache = new Map<string, Location>();

export function hebcalLocation(shop: ShopLocation): Location {
  const key = `${shop.latitude},${shop.longitude}`;
  let loc = locationCache.get(key);
  if (!loc) {
    loc = new Location(shop.latitude, shop.longitude, true, ISRAEL_TZ, "Shop", "IL");
    locationCache.set(key, loc);
  }
  return loc;
}

/** HDate reads local date components, so build the Date from components — correct in any server TZ. */
function hdate(date: CivilDate) {
  return new HDate(new Date(date.y, date.m - 1, date.d));
}

function sameCivil(a: Date, b: CivilDate) {
  return a.getFullYear() === b.y && a.getMonth() + 1 === b.m && a.getDate() === b.d;
}

export function isWorkForbidden(instant: Date, shop: ShopLocation): boolean {
  return isAssurBemlacha(instant, hebcalLocation(shop), false);
}

export function dayContext(date: CivilDate, shop: ShopLocation): DayContext {
  const location = hebcalLocation(shop);
  const next = addDays(date, 1);
  const events = HebrewCalendar.calendar({
    start: hdate(date),
    end: hdate(next),
    candlelighting: true,
    location,
    il: true,
  });

  const holidays: Holiday[] = [];
  let candleLighting: Date | null = null;

  for (const e of events) {
    const onThisDay = sameCivil(e.getDate().greg(), date);
    const mask = e.getFlags();
    if (onThisDay && mask & flags.LIGHT_CANDLES && "eventTime" in e && e.getDesc() === "Candle lighting") {
      candleLighting = (e as unknown as { eventTime: Date }).eventTime;
    }
    const isHolidayLike = mask & (flags.CHAG | flags.CHOL_HAMOED | flags.EREV | flags.MAJOR_FAST | flags.MINOR_FAST);
    if (onThisDay && isHolidayLike && !("eventTime" in e)) {
      holidays.push({
        nameHe: e.render("he-x-NoNikud"),
        nameEn: e.render("en"),
        chag: Boolean(mask & flags.CHAG),
        cholHamoed: Boolean(mask & flags.CHOL_HAMOED),
      });
    }
  }

  let erevOfHe: string | null = null;
  let erevOfEn: string | null = null;
  if (candleLighting) {
    const tomorrow = dayContextHolidaysOnly(next, location);
    const chag = tomorrow.find((h) => h.chag);
    if (chag) {
      erevOfHe = chag.nameHe;
      erevOfEn = chag.nameEn;
    } else if (weekdayOf(date) === 5) {
      erevOfHe = "שבת";
      erevOfEn = "Shabbat";
    }
  }

  return {
    date,
    weekday: weekdayOf(date),
    hebrewDateHe: hdate(date).renderGematriya(true),
    holidays,
    candleLighting,
    erevOfHe,
    erevOfEn,
  };
}

function dayContextHolidaysOnly(date: CivilDate, location: Location): Holiday[] {
  const events = HebrewCalendar.calendar({ start: hdate(date), end: hdate(date), il: true, location });
  return events
    .filter((e) => sameCivil(e.getDate().greg(), date) && e.getFlags() & flags.CHAG)
    .map((e) => ({ nameHe: e.render("he-x-NoNikud"), nameEn: e.render("en"), chag: true, cholHamoed: false }));
}

export { formatIsraelTime };
