"use client";

import { useRouter } from "next/navigation";
import { useFormatter, useLocale, useNow, useTranslations } from "next-intl";
import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { agorot } from "@/domain/money/agorot";
import { formatAgorot } from "@/domain/money/format";
import type { Locale } from "@/i18n/routing";
import { extendHold, holdSlot, releaseHold, setDeliveryCity } from "@/infra/cart/actions";
import type { SlotDay } from "@/infra/cart/repository";
import { cx } from "../../cx";
import { Button } from "../../primitives/Button";
import { InterestForm } from "../InterestForm";
import { useProblemText } from "../useProblemText";

export interface ZoneInfo {
  nameHe: string;
  nameEn: string;
  deliveryFeeAgorot: number;
  freeDeliveryOverAgorot: number | null;
  minOrderAgorot: number;
}

export interface HeldSlot {
  slotId: string;
  expiresAt: string;
  startsAt: string;
  endsAt: string;
}

export function DeliveryPanel({
  city,
  zone,
  servedCities,
  days,
  held,
}: {
  city: string | null;
  zone: ZoneInfo | null;
  servedCities: string[];
  days: SlotDay[];
  held: HeldSlot | null;
}) {
  const t = useTranslations("shop.cart");
  const locale = useLocale() as Locale;
  const [editingCity, setEditingCity] = useState(!zone);

  return (
    <section aria-labelledby="delivery-title" className="bg-bone-50 ring-bone-300 flex flex-col gap-5 rounded-2xl p-5 ring-1">
      <h2 id="delivery-title" className="text-xl font-bold">
        {t("deliveryTitle")}
      </h2>

      {zone && !editingCity ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-medium">{t("zoneServed", { city: city ?? "", zone: locale === "he" ? zone.nameHe : zone.nameEn })}</p>
            <p className="text-char-700 text-sm">
              {zone.freeDeliveryOverAgorot !== null
                ? t("zoneTerms", {
                    fee: formatAgorot(agorot(zone.deliveryFeeAgorot), locale),
                    free: formatAgorot(agorot(zone.freeDeliveryOverAgorot), locale),
                    min: formatAgorot(agorot(zone.minOrderAgorot), locale),
                  })
                : t("zoneTermsNoFree", {
                    fee: formatAgorot(agorot(zone.deliveryFeeAgorot), locale),
                    min: formatAgorot(agorot(zone.minOrderAgorot), locale),
                  })}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditingCity(true)}
            className="text-wine-600 min-h-11 text-sm font-medium underline-offset-4 hover:underline"
          >
            {t("changeCity")}
          </button>
        </div>
      ) : (
        <CityForm initial={city ?? ""} servedCities={servedCities} onDone={() => setEditingCity(false)} />
      )}

      {zone && !editingCity && <SlotPicker days={days} held={held} />}
    </section>
  );
}

function CityForm({ initial, servedCities, onDone }: { initial: string; servedCities: string[]; onDone: () => void }) {
  const t = useTranslations("shop.cart");
  const problemText = useProblemText();
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<{ text: string; notServed: boolean; city: string } | null>(null);
  const [pending, start] = useTransition();
  const inputId = useId();
  const listId = useId();

  const submit = () =>
    start(async () => {
      setError(null);
      try {
        const r = await setDeliveryCity(value);
        if (r.ok) onDone();
        else setError({ text: problemText(r.problem), notServed: r.problem.key === "CITY_NOT_SERVED" || r.problem.key === "ZONE_PAUSED", city: value.trim() });
      } catch {
        setError({ text: problemText({ key: "NETWORK" }), notServed: false, city: "" });
      }
    });

  return (
    <div className="flex flex-col gap-3">
      <form
        className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <label htmlFor={inputId} className="text-char-700 text-sm font-medium">
        {t("cityLabel")}
      </label>
      <div className="flex flex-wrap items-start gap-2">
        <input
          id={inputId}
          list={listId}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t("cityPlaceholder")}
          autoComplete="address-level2"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className="bg-bone-50 focus:ring-wine-500 min-h-11 min-w-0 flex-1 rounded-lg border border-bone-300 px-3 outline-none focus:ring-2"
        />
        <datalist id={listId}>
          {servedCities.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <Button type="submit" variant="secondary" pendingLabel={pending ? t("cityChecking") : null} disabledReason={value.trim() ? null : t("cityRequired")}>
          {t("cityCheck")}
        </Button>
      </div>
      {error && (
        <div id={`${inputId}-error`} role="alert" className="flex flex-col gap-2">
          <p className="text-bad-600 font-medium">{error.text}</p>
          {error.notServed && (
            <>
              <p className="text-char-700 text-sm">{t("notServedHelp")}</p>
              <details className="text-sm">
                <summary className="text-wine-600 cursor-pointer font-medium">{t("servedCities")}</summary>
                <p className="text-char-700 mt-2">{servedCities.join(" · ")}</p>
              </details>
            </>
          )}
        </div>
      )}
      </form>
      {/* Outside the city form: forms can't nest. */}
      {error?.notServed && error.city && <InterestForm key={error.city} target={{ kind: "AREA", city: error.city }} />}
    </div>
  );
}

function SlotPicker({ days, held }: { days: SlotDay[]; held: HeldSlot | null }) {
  const t = useTranslations("shop.cart");
  const locale = useLocale() as Locale;
  const format = useFormatter();
  const problemText = useProblemText();
  const [pendingSlot, setPendingSlot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Survives the refresh that follows expiry, so the customer is told why the hold disappeared.
  const [expiredNotice, setExpiredNotice] = useState(false);
  const [, start] = useTransition();

  const initialDay = useMemo(() => {
    if (held) return days.findIndex((d) => d.slots.some((s) => s.id === held.slotId));
    const firstOpen = days.findIndex((d) => d.slots.some((s) => s.availability.kind === "AVAILABLE"));
    return firstOpen === -1 ? 0 : firstOpen;
  }, [days, held]);
  const [dayIndex, setDayIndex] = useState(Math.max(0, initialDay));
  const day = days[dayIndex];

  const time = (iso: string) => format.dateTime(new Date(iso), { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const dayLabel = (d: SlotDay, i: number) =>
    i === 0 ? t("today") : i === 1 ? t("tomorrow") : format.dateTime(new Date(`${d.date}T12:00:00Z`), { weekday: "short" });

  const choose = (slotId: string) => {
    setError(null);
    setExpiredNotice(false);
    setPendingSlot(slotId);
    start(async () => {
      try {
        const r = await holdSlot(slotId);
        if (!r.ok) setError(problemText(r.problem));
      } catch {
        setError(problemText({ key: "NETWORK" }));
      } finally {
        setPendingSlot(null);
      }
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-semibold">{t("slotTitle")}</h3>

      {held && <HoldBanner held={held} time={time} onExpired={() => setExpiredNotice(true)} />}
      {!held && expiredNotice && (
        <p role="alert" className="bg-warn-600/10 text-warn-600 rounded-lg p-3 font-medium">
          {t("slotExpired")}
        </p>
      )}

      <div role="tablist" aria-label={t("slotTitle")} className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {days.map((d, i) => {
          const open = d.slots.filter((s) => s.availability.kind === "AVAILABLE").length;
          const selected = i === dayIndex;
          return (
            <button
              key={d.date}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setDayIndex(i)}
              className={cx(
                "flex min-h-16 min-w-20 shrink-0 flex-col items-center justify-center rounded-xl px-3 py-2 text-sm ring-1 ring-inset",
                selected ? "bg-char-900 text-bone-50 ring-char-900" : "bg-bone-50 ring-bone-300 hover:bg-bone-100",
                !selected && open === 0 && "text-char-500",
              )}
            >
              <span className="font-semibold">{dayLabel(d, i)}</span>
              <span className="tabular-nums">{format.dateTime(new Date(`${d.date}T12:00:00Z`), { day: "numeric", month: "numeric" })}</span>
              {d.closedReason && <span className={cx("text-[11px]", selected ? "text-bone-300" : "text-char-500")}>{t("dayClosed")}</span>}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" className="flex flex-col gap-2">
        {locale === "he" && <p className="text-char-500 text-xs">{day.hebrewDateHe}</p>}
        {day.closedReason ? (
          <p className="bg-bone-100 text-char-700 rounded-lg p-4 font-medium">{locale === "he" ? day.closedReason.he : day.closedReason.en}</p>
        ) : day.slots.length === 0 ? (
          <p className="bg-bone-100 text-char-700 rounded-lg p-4">{t("noSlotsDay")}</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {day.slots.map((s) => {
              const isHeld = held?.slotId === s.id;
              const a = s.availability;
              const reason =
                a.kind === "AVAILABLE"
                  ? null
                  : a.kind === "FULL"
                    ? t("slotFull")
                    : a.kind === "PAST_CUTOFF"
                      ? t("slotPastCutoff")
                      : a.kind === "TOO_SOON"
                        ? t("slotTooSoon")
                        : locale === "he"
                          ? a.reasonHe
                          : a.reasonEn;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    disabled={Boolean(reason) || pendingSlot !== null || isHeld}
                    aria-pressed={isHeld}
                    onClick={() => choose(s.id)}
                    className={cx(
                      "flex min-h-16 w-full flex-col items-start justify-center gap-0.5 rounded-xl px-4 py-2 text-start ring-1 ring-inset transition-colors",
                      isHeld
                        ? "bg-wine-600 text-bone-50 ring-wine-600"
                        : reason
                          ? "bg-bone-100 text-char-500 ring-bone-200 cursor-not-allowed"
                          : "bg-bone-50 ring-bone-300 hover:bg-bone-100",
                    )}
                  >
                    <bdi className="text-base font-semibold tabular-nums" dir="ltr">
                      {time(s.startsAt)}–{time(s.endsAt)}
                    </bdi>
                    <span className="text-xs">
                      {pendingSlot === s.id
                        ? t("slotHolding")
                        : isHeld
                          ? t("slotHeld")
                          : reason ?? (a.kind === "AVAILABLE" && a.remainingOrders <= 3 ? t("slotLeft", { count: a.remainingOrders }) : " ")}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {error && (
          <p role="alert" className="text-bad-600 text-sm font-medium">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

function HoldBanner({ held, time, onExpired }: { held: HeldSlot; time: (iso: string) => string; onExpired: () => void }) {
  const t = useTranslations("shop.cart");
  const format = useFormatter();
  const router = useRouter();
  const problemText = useProblemText();
  const now = useNow({ updateInterval: 1000 });
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const remaining = Math.max(0, new Date(held.expiresAt).getTime() - now.getTime());
  const expired = remaining === 0;

  const firedRef = useRef(false);
  useEffect(() => {
    if (!expired || firedRef.current) return;
    firedRef.current = true; // once — the countdown re-renders every second
    onExpired();
    router.refresh();
  }, [expired, router, onExpired]);

  const mm = Math.floor(remaining / 60000);
  const ss = Math.floor((remaining % 60000) / 1000);
  const clock = `${mm}:${String(ss).padStart(2, "0")}`;

  if (expired) {
    return <p role="alert" className="bg-warn-600/10 text-warn-600 rounded-lg p-3 font-medium">{t("slotExpired")}</p>;
  }

  return (
    <div className="bg-wine-600/10 ring-wine-600/25 flex flex-wrap items-center justify-between gap-3 rounded-xl p-4 ring-1">
      <div>
        <p className="font-semibold">
          {t("slotHeld")} ·{" "}
          {format.dateTime(new Date(held.startsAt), { weekday: "long", day: "numeric", month: "numeric" })}{" "}
          <bdi dir="ltr" className="tabular-nums">
            {time(held.startsAt)}–{time(held.endsAt)}
          </bdi>
        </p>
        <p className="text-char-700 text-sm" aria-label={t("holdCountdownLabel")}>
          {t("slotHeldUntil", { time: clock })}
        </p>
        {error && <p role="alert" className="text-bad-600 text-sm">{error}</p>}
      </div>
      <div className="flex gap-2">
        {remaining <= 2 * 60000 && (
          <Button
            size="md"
            pendingLabel={pending ? t("slotHolding") : null}
            onClick={() =>
              start(async () => {
                const r = await extendHold().catch(() => null);
                if (!r?.ok) setError(r ? problemText(r.problem) : problemText({ key: "NETWORK" }));
              })
            }
          >
            {t("slotExtend")}
          </Button>
        )}
        <Button
          variant="ghost"
          onClick={() =>
            start(async () => {
              await releaseHold().catch(() => null);
            })
          }
        >
          {t("slotRelease")}
        </Button>
      </div>
    </div>
  );
}
