"use client";

import { useLocale, useTranslations } from "next-intl";
import { useId, useState, useTransition } from "react";
import { agorot } from "@/domain/money/agorot";
import { formatAgorot } from "@/domain/money/format";
import { fromDecimalShekels, toDecimalShekels } from "@/domain/money/wire";
import type { Locale } from "@/i18n/routing";
import type { SlotsProblem } from "@/infra/delivery/manage";
import { staffAddBlackout, staffApplyWindows, staffRemoveBlackout, staffUpdateZone } from "@/infra/delivery/manageActions";
import { cx } from "../cx";
import { Button } from "../primitives/Button";

const field = "bg-bone-50 ring-bone-300 focus-visible:ring-wine-600 min-h-11 rounded-lg px-3 ring-1 outline-none focus-visible:ring-2";

function useProblem() {
  const t = useTranslations("staff.zones.problems");
  const locale = useLocale() as Locale;
  return (p: SlotsProblem | { key: string } | null) => {
    if (!p) return t("NETWORK");
    if (p.key === "CITY_IN_OTHER_ZONE" && "city" in p) return t("CITY_IN_OTHER_ZONE", { city: p.city, zone: locale === "he" ? p.zoneHe : p.zoneEn });
    return t(p.key as never);
  };
}

/** Parses "35" / "35.50" into agorot, or null when the text isn't a price. */
function parseShekels(text: string): number | null {
  try {
    return fromDecimalShekels(text.trim().replace(",", "."));
  } catch {
    return null;
  }
}

const toLines = (text: string) => text.split(/[\n,]/).map((c) => c.trim()).filter(Boolean);

export function ZoneEditor({
  zone,
}: {
  zone: { id: string; citiesHe: string[]; citiesEn: string[]; deliveryFeeAgorot: number; freeDeliveryOverAgorot: number | null; minOrderAgorot: number; active: boolean };
}) {
  const t = useTranslations("staff.zones");
  const locale = useLocale() as Locale;
  const problemText = useProblem();
  const ids = { he: useId(), en: useId(), fee: useId(), free: useId(), min: useId(), active: useId() };
  const [citiesHe, setCitiesHe] = useState(zone.citiesHe.join("\n"));
  const [citiesEn, setCitiesEn] = useState(zone.citiesEn.join("\n"));
  const [fee, setFee] = useState(toDecimalShekels(agorot(zone.deliveryFeeAgorot)));
  const [freeOver, setFreeOver] = useState(zone.freeDeliveryOverAgorot === null ? "" : toDecimalShekels(agorot(zone.freeDeliveryOverAgorot)));
  const [min, setMin] = useState(toDecimalShekels(agorot(zone.minOrderAgorot)));
  const [active, setActive] = useState(zone.active);
  const [message, setMessage] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [pending, start] = useTransition();

  const feeA = parseShekels(fee);
  const minA = parseShekels(min);
  const freeA = freeOver.trim() === "" ? null : parseShekels(freeOver);
  const blocked =
    toLines(citiesHe).length === 0
      ? t("problems.CITIES_REQUIRED")
      : feeA === null || minA === null || (freeOver.trim() !== "" && freeA === null)
        ? t("problems.INVALID_MONEY")
        : null;

  const changedCities = toLines(citiesHe).filter((c) => !zone.citiesHe.includes(c));

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (blocked) return;
        setMessage(null);
        start(async () => {
          const r = await staffUpdateZone({ zoneId: zone.id, citiesHe: toLines(citiesHe), citiesEn: toLines(citiesEn), deliveryFeeAgorot: feeA!, freeDeliveryOverAgorot: freeA, minOrderAgorot: minA!, active }).catch(() => null);
          if (!r || !r.ok) return setMessage({ tone: "bad", text: problemText(r && !r.ok ? r.problem : null) });
          setMessage({ tone: "ok", text: r.notified ? t("savedNotified", { count: r.notified }) : t("saved") });
        });
      }}
    >
      <label htmlFor={ids.he} className="text-sm font-medium">
        {t("citiesHe")}
      </label>
      <textarea id={ids.he} rows={4} value={citiesHe} onChange={(e) => setCitiesHe(e.target.value)} className={cx(field, "py-2")} />
      <label htmlFor={ids.en} className="text-sm font-medium">
        {t("citiesEn")}
      </label>
      <textarea id={ids.en} rows={3} dir="ltr" value={citiesEn} onChange={(e) => setCitiesEn(e.target.value)} className={cx(field, "py-2 text-start")} />
      <p className="text-char-500 text-xs">{t("citiesHelp")}</p>

      <div className="grid grid-cols-3 gap-2">
        {[
          { id: ids.fee, label: t("fee"), value: fee, set: setFee },
          { id: ids.min, label: t("minOrder"), value: min, set: setMin },
          { id: ids.free, label: t("freeOver"), value: freeOver, set: setFreeOver },
        ].map((f) => (
          <div key={f.id} className="flex min-w-0 flex-col gap-1">
            <label htmlFor={f.id} className="text-xs font-medium">
              {f.label}
            </label>
            <input id={f.id} inputMode="decimal" dir="ltr" value={f.value} onChange={(e) => f.set(e.target.value)} className={cx(field, "w-full tabular-nums")} />
          </div>
        ))}
      </div>
      <p className="text-char-500 text-xs">{t("freeOverHelp")}</p>

      <label htmlFor={ids.active} className="flex min-h-11 items-center gap-3">
        <input id={ids.active} type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="accent-wine-600 size-5" />
        <span className="font-medium">{t("activeLabel")}</span>
      </label>
      {!active && zone.active && <p className="text-warn-600 text-sm">{t("pauseWarning")}</p>}

      {active && changedCities.length > 0 && feeA !== null && (
        <p className="bg-bone-100 rounded-lg p-2 text-sm">{t("addingCities", { cities: changedCities.join(", "), fee: formatAgorot(agorot(feeA), locale) })}</p>
      )}

      <Button type="submit" disabledReason={blocked} pendingLabel={pending ? t("saving") : null}>
        {t("save")}
      </Button>
      {message && (
        <p role={message.tone === "bad" ? "alert" : "status"} className={cx("text-sm font-medium", message.tone === "bad" ? "text-bad-600" : "text-ok-600")}>
          {message.text}
        </p>
      )}
    </form>
  );
}

export function BlackoutForm({ zoneId, zoneName, defaultDate }: { zoneId: string; zoneName: string; defaultDate: string }) {
  const t = useTranslations("staff.zones");
  const problemText = useProblem();
  const ids = { date: useId(), from: useId(), to: useId(), he: useId(), en: useId() };
  const [date, setDate] = useState(defaultDate);
  const [allDay, setAllDay] = useState(true);
  const [from, setFrom] = useState("08:00");
  const [to, setTo] = useState("13:00");
  const [scope, setScope] = useState<"zone" | "all">("zone");
  const [reasonHe, setReasonHe] = useState("");
  const [reasonEn, setReasonEn] = useState("");
  const [message, setMessage] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [pending, start] = useTransition();

  const blocked = !date ? t("problems.INVALID_DATE") : !allDay && from >= to ? t("problems.INVALID_TIMES") : reasonHe.trim().length < 2 ? t("problems.REASON_REQUIRED") : null;

  return (
    <form
      className="bg-bone-100 flex flex-col gap-3 rounded-xl p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (blocked) return;
        setMessage(null);
        start(async () => {
          const r = await staffAddBlackout({ date, fromTime: allDay ? null : from, toTime: allDay ? null : to, zoneId: scope === "zone" ? zoneId : null, reasonHe, reasonEn }).catch(() => null);
          if (!r || !r.ok) return setMessage({ tone: "bad", text: problemText(r && !r.ok ? r.problem : null) });
          setMessage({ tone: "ok", text: t("closureAdded") });
          setReasonHe("");
          setReasonEn("");
        });
      }}
    >
      <h4 className="font-semibold">{t("addClosure")}</h4>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor={ids.date} className="text-xs font-medium">
            {t("date")}
          </label>
          <input id={ids.date} type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} />
        </div>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} className="accent-wine-600 size-5" />
          {t("allDay")}
        </label>
        {!allDay && (
          <>
            <div className="flex flex-col gap-1">
              <label htmlFor={ids.from} className="text-xs font-medium">
                {t("from")}
              </label>
              <input id={ids.from} type="time" value={from} onChange={(e) => setFrom(e.target.value)} className={field} />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor={ids.to} className="text-xs font-medium">
                {t("to")}
              </label>
              <input id={ids.to} type="time" value={to} onChange={(e) => setTo(e.target.value)} className={field} />
            </div>
          </>
        )}
      </div>
      <fieldset className="flex flex-wrap gap-4 text-sm">
        <legend className="sr-only">{t("scope")}</legend>
        <label className="flex min-h-11 items-center gap-2">
          <input type="radio" name={`scope-${zoneId}`} checked={scope === "zone"} onChange={() => setScope("zone")} className="accent-wine-600 size-5" />
          {t("onlyZone", { zone: zoneName })}
        </label>
        <label className="flex min-h-11 items-center gap-2">
          <input type="radio" name={`scope-${zoneId}`} checked={scope === "all"} onChange={() => setScope("all")} className="accent-wine-600 size-5" />
          {t("allZones")}
        </label>
      </fieldset>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor={ids.he} className="text-xs font-medium">
            {t("reasonHe")}
          </label>
          <input id={ids.he} value={reasonHe} maxLength={80} onChange={(e) => setReasonHe(e.target.value)} className={field} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={ids.en} className="text-xs font-medium">
            {t("reasonEn")}
          </label>
          <input id={ids.en} dir="ltr" value={reasonEn} maxLength={80} onChange={(e) => setReasonEn(e.target.value)} className={cx(field, "text-start")} />
        </div>
      </div>
      <p className="text-char-500 text-xs">{t("closureHelp")}</p>
      <Button type="submit" variant="secondary" disabledReason={blocked} pendingLabel={pending ? t("saving") : null}>
        {t("addClosureButton")}
      </Button>
      {message && (
        <p role={message.tone === "bad" ? "alert" : "status"} className={cx("text-sm font-medium", message.tone === "bad" ? "text-bad-600" : "text-ok-600")}>
          {message.text}
        </p>
      )}
    </form>
  );
}

export function RemoveBlackout({ id }: { id: string }) {
  const t = useTranslations("staff.zones");
  const problemText = useProblem();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="flex flex-col items-end gap-1">
      <Button
        variant="ghost"
        pendingLabel={pending ? t("removing") : null}
        onClick={() =>
          start(async () => {
            const r = await staffRemoveBlackout(id).catch(() => null);
            if (!r || !r.ok) setError(problemText(r && !r.ok ? r.problem : null));
          })
        }
      >
        {t("remove")}
      </Button>
      {error && (
        <span role="alert" className="text-bad-600 text-xs">
          {error}
        </span>
      )}
    </span>
  );
}

export function ApplyWindows({ affected }: { affected: number }) {
  const t = useTranslations("staff.zones");
  const problemText = useProblem();
  const [pending, start] = useTransition();
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);

  return (
    <div className="flex flex-col items-start gap-2">
      {affected > 0 && (
        <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="accent-wine-600 size-5" />
          {t("confirmAffected", { count: affected })}
        </label>
      )}
      <Button
        disabledReason={affected > 0 && !confirmed ? t("confirmFirst") : null}
        pendingLabel={pending ? t("applying") : null}
        onClick={() => {
          setMessage(null);
          start(async () => {
            const r = await staffApplyWindows().catch(() => null);
            setMessage(!r || !r.ok ? { tone: "bad", text: problemText(r && !r.ok ? r.problem : null) } : { tone: "ok", text: t("applied") });
          });
        }}
      >
        {t("apply")}
      </Button>
      {message && (
        <p role={message.tone === "bad" ? "alert" : "status"} className={cx("text-sm font-medium", message.tone === "bad" ? "text-bad-600" : "text-ok-600")}>
          {message.text}
        </p>
      )}
    </div>
  );
}
