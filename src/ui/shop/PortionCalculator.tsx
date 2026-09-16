"use client";

import { useLocale, useTranslations } from "next-intl";
import { useId, useRef, useState } from "react";
import { APPETITES, type Appetite, portionFor } from "@/domain/catalog/portions";
import { formatGrams, type Grams, grams } from "@/domain/weight/grams";
import type { Locale } from "@/i18n/routing";
import { cx } from "../cx";

/**
 * "How much do I need?" — people, appetite and whether there are sides, straight into the weight picker.
 * Opens closed, because most people know what they want; the result is applied as you change it, never
 * behind an extra confirm.
 */
export function PortionCalculator({
  servingG,
  limits,
  onChange,
}: {
  servingG: number;
  limits: { minOrderG: number; maxOrderG: number; stepG: number };
  onChange: (value: Grams) => void;
}) {
  const t = useTranslations("shop.portions");
  const locale = useLocale() as Locale;
  const [open, setOpen] = useState(false);
  const [people, setPeople] = useState(4);
  const [appetite, setAppetite] = useState<Appetite>("REGULAR");
  const [withSides, setWithSides] = useState(true);
  const panelId = useId();

  // The latest choices, so two quick taps on "+" both count instead of reading the same render's value twice.
  const latest = useRef({ people, appetite, withSides });
  const apply = (next: { people?: number; appetite?: Appetite; withSides?: boolean }) => {
    const merged = { ...latest.current, ...next };
    latest.current = merged;
    setPeople(merged.people);
    setAppetite(merged.appetite);
    setWithSides(merged.withSides);
    onChange(grams(portionFor({ servingG, ...merged }, limits).grams));
  };

  const result = portionFor({ servingG, people, appetite, withSides }, limits);

  return (
    <div className="border-bone-300 border-t pt-4">
      <button
        type="button"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) apply({});
        }}
        aria-expanded={open}
        aria-controls={panelId}
        className="text-wine-600 hover:text-char-900 inline-flex min-h-11 items-center gap-2 text-sm font-semibold"
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <circle cx="9" cy="8" r="3" />
          <circle cx="16.5" cy="9" r="2.3" />
          <path d="M3.5 19c.9-3 3-4.5 5.5-4.5s4.6 1.5 5.5 4.5M16 14.6c2 .3 3.4 1.7 4.2 4.4" />
        </svg>
        {t("title")}
      </button>

      {open && (
        <div id={panelId} className="mt-3 flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-char-500 w-24 text-sm" id={`${panelId}-people`}>
              {t("people")}
            </span>
            <div className="flex items-center" role="group" aria-labelledby={`${panelId}-people`}>
              <button
                type="button"
                onClick={() => apply({ people: Math.max(1, latest.current.people - 1) })}
                disabled={people <= 1}
                aria-label={t("fewer")}
                className="border-bone-300 hover:border-char-900 disabled:text-char-500 disabled:hover:border-bone-300 grid size-11 place-items-center border text-lg"
              >
                −
              </button>
              <output className="font-display w-12 text-center text-2xl tabular-nums">{people}</output>
              <button
                type="button"
                onClick={() => apply({ people: Math.min(30, latest.current.people + 1) })}
                disabled={people >= 30}
                aria-label={t("more")}
                className="border-bone-300 hover:border-char-900 disabled:text-char-500 disabled:hover:border-bone-300 grid size-11 place-items-center border text-lg"
              >
                +
              </button>
            </div>
            {people >= 30 && <span className="text-char-700 w-full text-sm">{t("maxPeople", { max: 30 })}</span>}
          </div>

          <fieldset className="flex flex-wrap items-center gap-3">
            <legend className="sr-only">{t("appetite")}</legend>
            <span className="text-char-500 w-24 text-sm" aria-hidden>
              {t("appetite")}
            </span>
            <div className="flex flex-wrap gap-2">
              {APPETITES.map((a) => (
                <label
                  key={a}
                  className={cx(
                    "has-focus-visible:outline-wine-600 inline-flex min-h-11 cursor-pointer items-center rounded-[2px] px-4 text-sm font-medium ring-1 ring-inset has-focus-visible:outline-2 has-focus-visible:outline-offset-2",
                    a === appetite ? "bg-char-900 text-bone-50 ring-char-900" : "ring-bone-300 hover:ring-char-900",
                  )}
                >
                  <input type="radio" name={`${panelId}-appetite`} checked={a === appetite} onChange={() => apply({ appetite: a })} className="sr-only" />
                  {t(`appetiteOption.${a}`)}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={withSides}
              onChange={(e) => apply({ withSides: e.target.checked })}
              className="accent-wine-600 size-5"
            />
            {t("withSides")}
          </label>

          <p className="text-char-700 border-bone-300 border-s-2 ps-3 text-sm leading-relaxed">
            {t("result", { amount: formatGrams(grams(result.grams), locale), people })}
            {result.adjusted === "RAISED_TO_MIN" && ` ${t("raisedToMin", { min: formatGrams(grams(limits.minOrderG), locale) })}`}
            {result.adjusted === "LOWERED_TO_MAX" && ` ${t("loweredToMax", { max: formatGrams(grams(limits.maxOrderG), locale) })}`}
          </p>
        </div>
      )}
    </div>
  );
}
