import { addDays, type CivilDate, formatIsraelTime, israelInstant, parseTime, toIsoDate } from "./israelTime";
import { type DayContext, dayContext, isWorkForbidden, type ShopLocation } from "./jewishCalendar";

/**
 * In plain words: turn weekly delivery templates into concrete windows for the coming weeks, and
 * close every window that touches Shabbat or a Yom Tov, or that would end too close to candle
 * lighting on an eve. Closed windows keep a reason in Hebrew and English — the customer is always
 * told why, never shown a blank.
 */

export interface SlotTemplate {
  id: string;
  zoneId: string;
  weekday: number; // 0 = Sunday
  startTime: string; // "08:00"
  endTime: string;
  capacityOrders: number;
  capacityWeightG: number;
  cutoffLeadMinutes: number;
}

export interface ManualBlackout {
  date: string; // yyyy-mm-dd
  fromTime: string | null;
  toTime: string | null;
  zoneId: string | null;
  reasonHe: string;
  reasonEn: string;
}

export type SlotReasonKey = "SHABBAT" | "CHAG" | "EARLY_CLOSE" | "MANUAL";

export interface PlannedSlot {
  zoneId: string;
  templateId: string;
  serviceDate: string;
  startsAt: Date;
  endsAt: Date;
  cutoffAt: Date;
  capacityOrders: number;
  capacityWeightG: number;
  status: "OPEN" | "BLACKOUT";
  reasonKey: SlotReasonKey | null;
  reasonHe: string | null;
  reasonEn: string | null;
  hebrewDateHe: string;
}

export interface SlotPlanInput {
  templates: SlotTemplate[];
  from: CivilDate;
  days: number;
  shop: ShopLocation;
  /** Last slot on an eve must end this many minutes before candle lighting. */
  erevBufferMinutes: number;
  manualBlackouts?: ManualBlackout[];
}

export interface DayReason {
  key: SlotReasonKey;
  he: string;
  en: string;
}

/** Why a whole day has no deliveries, if it doesn't. */
export function closedDayReason(ctx: DayContext): DayReason | null {
  const chag = ctx.holidays.find((h) => h.chag);
  if (chag) return { key: "CHAG", he: `${chag.nameHe} — אין משלוחים`, en: `${chag.nameEn} — no deliveries` };
  if (ctx.weekday === 6) return { key: "SHABBAT", he: "שבת — אין משלוחים", en: "Shabbat — no deliveries" };
  return null;
}

function earlyCloseReason(ctx: DayContext): DayReason {
  const time = formatIsraelTime(ctx.candleLighting!);
  return {
    key: "EARLY_CLOSE",
    he: `סגירה מוקדמת — ערב ${ctx.erevOfHe ?? "חג"} (הדלקת נרות ${time})`,
    en: `Early close — eve of ${ctx.erevOfEn ?? "the holiday"} (candle lighting ${time})`,
  };
}

function overlapsManual(b: ManualBlackout, zoneId: string, date: string, start: Date, end: Date): boolean {
  if (b.date !== date || (b.zoneId !== null && b.zoneId !== zoneId)) return false;
  if (!b.fromTime || !b.toTime) return true;
  const [y, m, d] = date.split("-").map(Number);
  const [fh, fm] = parseTime(b.fromTime);
  const [th, tm] = parseTime(b.toTime);
  const from = israelInstant({ y, m, d }, fh, fm);
  const to = israelInstant({ y, m, d }, th, tm);
  return start < to && end > from;
}

export function planSlots(input: SlotPlanInput): PlannedSlot[] {
  const out: PlannedSlot[] = [];
  for (let i = 0; i < input.days; i++) {
    const date = addDays(input.from, i);
    const iso = toIsoDate(date);
    const templates = input.templates.filter((t) => t.weekday === new Date(Date.UTC(date.y, date.m - 1, date.d)).getUTCDay());
    if (templates.length === 0) continue;

    const ctx = dayContext(date, input.shop);
    const closedDay = closedDayReason(ctx);
    const earlyLimit = ctx.candleLighting
      ? new Date(ctx.candleLighting.getTime() - input.erevBufferMinutes * 60000)
      : null;

    for (const t of templates) {
      const [sh, sm] = parseTime(t.startTime);
      const [eh, em] = parseTime(t.endTime);
      const startsAt = israelInstant(date, sh, sm);
      const endsAt = israelInstant(date, eh, em);
      const cutoffAt = new Date(startsAt.getTime() - t.cutoffLeadMinutes * 60000);

      let reason: DayReason | null = null;
      if (closedDay) {
        reason = closedDay;
      } else if (earlyLimit && endsAt > earlyLimit) {
        // Checked before the generic rule so an eve's late windows name the candle-lighting time.
        reason = earlyCloseReason(ctx);
      } else if (isWorkForbidden(startsAt, input.shop) || isWorkForbidden(new Date(endsAt.getTime() - 60000), input.shop)) {
        reason = { key: "CHAG", he: "חג — אין משלוחים", en: "Holiday — no deliveries" };
      } else {
        const manual = input.manualBlackouts?.find((b) => overlapsManual(b, t.zoneId, iso, startsAt, endsAt));
        if (manual) reason = { key: "MANUAL", he: manual.reasonHe, en: manual.reasonEn };
      }

      out.push({
        zoneId: t.zoneId,
        templateId: t.id,
        serviceDate: iso,
        startsAt,
        endsAt,
        cutoffAt,
        capacityOrders: t.capacityOrders,
        capacityWeightG: t.capacityWeightG,
        status: reason ? "BLACKOUT" : "OPEN",
        reasonKey: reason?.key ?? null,
        reasonHe: reason?.he ?? null,
        reasonEn: reason?.en ?? null,
        hebrewDateHe: ctx.hebrewDateHe,
      });
    }
  }
  return out;
}

export type SlotAvailability =
  | { kind: "AVAILABLE"; remainingOrders: number }
  | { kind: "FULL" }
  | { kind: "PAST_CUTOFF" }
  | { kind: "TOO_SOON"; leadMinutes: number }
  | { kind: "CLOSED"; reasonHe: string; reasonEn: string };

/** Whether a customer can pick a slot right now, and if not, exactly why. */
export function slotAvailability(
  slot: {
    status: "OPEN" | "CLOSED" | "BLACKOUT";
    startsAt: Date;
    cutoffAt: Date;
    capacityOrders: number;
    reservedOrders: number;
    activeHolds: number;
    reasonHe: string | null;
    reasonEn: string | null;
  },
  now: Date,
  zoneLeadMinutes: number,
): SlotAvailability {
  if (slot.status !== "OPEN") {
    return { kind: "CLOSED", reasonHe: slot.reasonHe ?? "סגור", reasonEn: slot.reasonEn ?? "Closed" };
  }
  if (now >= slot.cutoffAt) return { kind: "PAST_CUTOFF" };
  if (slot.startsAt.getTime() - now.getTime() < zoneLeadMinutes * 60000) return { kind: "TOO_SOON", leadMinutes: zoneLeadMinutes };
  const remaining = slot.capacityOrders - slot.reservedOrders - slot.activeHolds;
  if (remaining <= 0) return { kind: "FULL" };
  return { kind: "AVAILABLE", remainingOrders: remaining };
}
