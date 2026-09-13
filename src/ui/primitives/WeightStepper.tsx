"use client";

import { useLocale, useTranslations } from "next-intl";
import { useId } from "react";
import { formatGrams, type Grams, grams } from "@/domain/weight/grams";
import type { Locale } from "@/i18n/routing";
import { cx } from "../cx";

interface WeightStepperProps {
  value: Grams;
  min: Grams;
  max: Grams;
  step: Grams;
  onChange: (value: Grams) => void;
  size?: "md" | "lg";
  label: string;
  /** Overrides the default "maximum per order" sentence, e.g. when stock is the limit. */
  maxReason?: string;
}

/** − value + for a requested weight. At a limit, the blocked button says why in visible text. */
export function WeightStepper({ value, min, max, step, onChange, size = "md", label, maxReason }: WeightStepperProps) {
  const t = useTranslations("ui.stepper");
  const locale = useLocale() as Locale;
  const reasonId = useId();
  const labelId = useId();

  const atMin = value - step < min;
  const atMax = value + step > max;
  const reason = atMin
    ? t("atMin", { min: formatGrams(min, locale) })
    : atMax
      ? (maxReason ?? t("atMax", { max: formatGrams(max, locale) }))
      : null;

  const buttonClass = cx(
    "grid place-items-center rounded-lg font-medium ring-1 ring-inset transition-colors",
    "focus-visible:outline-wine-500 focus-visible:outline-2 focus-visible:outline-offset-2",
    "enabled:ring-char-900/20 enabled:hover:bg-bone-200 disabled:cursor-not-allowed disabled:text-char-500 disabled:ring-bone-300 disabled:bg-bone-100",
    size === "lg" ? "size-16 text-3xl" : "size-11 text-xl",
  );

  return (
    <div className="flex flex-col gap-1">
      <span id={labelId} className="sr-only">
        {label}
      </span>
      <div role="group" aria-labelledby={labelId} className="flex items-center gap-3">
        <button
          type="button"
          className={buttonClass}
          disabled={atMin}
          aria-describedby={atMin ? reasonId : undefined}
          aria-label={t("decrease", { step: formatGrams(step, locale) })}
          onClick={() => onChange(grams(Math.max(min, value - step)))}
        >
          −
        </button>
        <output
          aria-live="polite"
          className={cx("min-w-28 text-center font-semibold tabular-nums", size === "lg" ? "text-3xl" : "text-xl")}
        >
          <bdi>{formatGrams(value, locale)}</bdi>
        </output>
        <button
          type="button"
          className={buttonClass}
          disabled={atMax}
          aria-describedby={atMax ? reasonId : undefined}
          aria-label={t("increase", { step: formatGrams(step, locale) })}
          onClick={() => onChange(grams(Math.min(max, value + step)))}
        >
          +
        </button>
      </div>
      <span id={reasonId} className={cx("text-char-700 min-h-5 text-sm", !reason && "invisible")}>
        {reason ?? " "}
      </span>
    </div>
  );
}
