/**
 * Civil dates and wall-clock times in Israel, independent of the server's own time zone.
 * A server in UTC and a laptop in Tel Aviv must produce identical delivery slots.
 */

export const ISRAEL_TZ = "Asia/Jerusalem";

export interface CivilDate {
  y: number;
  m: number; // 1–12
  d: number;
}

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: ISRAEL_TZ,
  hourCycle: "h23",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
  weekday: "short",
});

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export function israelParts(instant: Date) {
  const p = Object.fromEntries(partsFormatter.formatToParts(instant).map((x) => [x.type, x.value]));
  return {
    y: Number(p.year),
    m: Number(p.month),
    d: Number(p.day),
    hour: Number(p.hour),
    minute: Number(p.minute),
    second: Number(p.second),
    weekday: WEEKDAYS[p.weekday],
  };
}

function offsetMinutes(instant: Date): number {
  const p = israelParts(instant);
  const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.hour, p.minute, p.second);
  return Math.round((asUtc - Math.floor(instant.getTime() / 1000) * 1000) / 60000);
}

/** The instant at which Israeli wall-clock time reads `date hh:mm`. */
export function israelInstant(date: CivilDate, hh: number, mm: number): Date {
  const guess = Date.UTC(date.y, date.m - 1, date.d, hh, mm);
  const first = guess - offsetMinutes(new Date(guess)) * 60000;
  const second = guess - offsetMinutes(new Date(first)) * 60000;
  return new Date(second);
}

export function israelDateOf(instant: Date): CivilDate {
  const { y, m, d } = israelParts(instant);
  return { y, m, d };
}

export function addDays(date: CivilDate, days: number): CivilDate {
  const t = new Date(Date.UTC(date.y, date.m - 1, date.d + days));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

export function weekdayOf(date: CivilDate): number {
  return new Date(Date.UTC(date.y, date.m - 1, date.d)).getUTCDay();
}

export function toIsoDate(date: CivilDate): string {
  return `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
}

export function fromIsoDate(iso: string): CivilDate {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
}

/** "08:30" or "08:30:00" → [8, 30] */
export function parseTime(time: string): [number, number] {
  const [h, m] = time.split(":").map(Number);
  return [h, m];
}

export function formatIsraelTime(instant: Date): string {
  const p = israelParts(instant);
  return `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
}
