"use client";

import { useTranslations } from "next-intl";
import { useId } from "react";
import { cx } from "../cx";

/** − n + for whole units (bundles). At a limit, the blocked button says why in visible text. */
export function QuantityStepper({
  value,
  max,
  onChange,
  label,
  maxReason,
}: {
  value: number;
  max: number;
  onChange: (value: number) => void;
  label: string;
  maxReason: string;
}) {
  const t = useTranslations("ui.quantity");
  const reasonId = useId();
  const atMin = value <= 1;
  const atMax = value >= max;
  const reason = atMax ? maxReason : atMin ? t("atMin") : null;

  const buttonClass = cx(
    "grid size-11 place-items-center rounded-lg text-xl font-medium ring-1 ring-inset",
    "focus-visible:outline-wine-500 focus-visible:outline-2 focus-visible:outline-offset-2",
    "enabled:ring-char-900/20 enabled:hover:bg-bone-200 disabled:cursor-not-allowed disabled:bg-bone-100 disabled:text-char-500 disabled:ring-bone-300",
  );

  return (
    <div className="flex flex-col gap-1">
      <div role="group" aria-label={label} className="flex items-center gap-3">
        <button
          type="button"
          className={buttonClass}
          disabled={atMin}
          aria-describedby={atMin ? reasonId : undefined}
          aria-label={t("decrease")}
          onClick={() => onChange(Math.max(1, value - 1))}
        >
          −
        </button>
        <output aria-live="polite" className="min-w-16 text-center text-xl font-semibold tabular-nums">
          {value}
        </output>
        <button
          type="button"
          className={buttonClass}
          disabled={atMax}
          aria-describedby={atMax ? reasonId : undefined}
          aria-label={t("increase")}
          onClick={() => onChange(Math.min(max, value + 1))}
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
