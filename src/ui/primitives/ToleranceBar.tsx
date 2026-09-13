"use client";

import { useLocale, useTranslations } from "next-intl";
import { formatGrams, type Grams } from "@/domain/weight/grams";
import { classifyWeight, type ToleranceBounds } from "@/domain/weight/tolerance";
import type { Locale } from "@/i18n/routing";
import { cx } from "../cx";

/**
 * min → requested → max with the actual weight as a marker. Colour is never the only signal:
 * the sentence underneath always states the result in words.
 */
export function ToleranceBar({ bounds, actual }: { bounds: ToleranceBounds; actual: Grams | null }) {
  const t = useTranslations("ui.tolerance");
  const locale = useLocale() as Locale;

  const pad = Math.max(1, Math.round((bounds.max - bounds.min) / 2));
  const scaleMin = bounds.min - pad;
  const scaleMax = bounds.max + pad;
  const pct = (g: number) => Math.min(100, Math.max(0, ((g - scaleMin) / (scaleMax - scaleMin)) * 100));

  const status = actual === null ? null : classifyWeight(actual, bounds);
  const tone =
    status === null
      ? "neutral"
      : status.kind === "over" || status.kind === "under"
        ? "bad"
        : status.nearEdge
          ? "warn"
          : "ok";

  const percent = (bp: number) =>
    new Intl.NumberFormat(locale === "he" ? "he-IL" : "en-IL", {
      style: "percent",
      signDisplay: "exceptZero",
      maximumFractionDigits: 1,
    }).format(bp / 10000);

  const sentence =
    status === null
      ? t("waiting")
      : status.kind === "over"
        ? t("over", { amount: formatGrams(status.overBy, locale) })
        : status.kind === "under"
          ? t("under", { amount: formatGrams(status.shortBy, locale) })
          : status.nearEdge
            ? t("nearEdge", { deviation: percent(status.deviationBp) })
            : t("within", { deviation: percent(status.deviationBp) });

  return (
    <div className="flex flex-col gap-2" data-tone={tone}>
      <div className="bg-bone-200 relative h-3 rounded-full">
        <div
          className={cx(
            "absolute inset-y-0 rounded-full",
            tone === "bad" ? "bg-bad-600/25" : tone === "warn" ? "bg-warn-600/25" : "bg-ok-600/25",
          )}
          style={{ insetInlineStart: `${pct(bounds.min)}%`, insetInlineEnd: `${100 - pct(bounds.max)}%` }}
        />
        <div
          className="bg-char-900/40 absolute inset-y-0 w-0.5"
          style={{ insetInlineStart: `${pct(bounds.requested)}%` }}
        />
        {actual !== null && (
          <div
            aria-hidden
            className={cx(
              "absolute top-1/2 size-5 -translate-y-1/2 rounded-full border-2 border-bone-50 shadow",
              "ltr:-translate-x-1/2 rtl:translate-x-1/2",
              tone === "bad" ? "bg-bad-600" : tone === "warn" ? "bg-warn-600" : "bg-ok-600",
            )}
            style={{ insetInlineStart: `${pct(actual)}%` }}
          />
        )}
      </div>
      <div className="text-char-700 grid grid-cols-3 text-xs tabular-nums">
        {(
          [
            ["min", bounds.min, "text-start"],
            ["requested", bounds.requested, "text-center"],
            ["max", bounds.max, "text-end"],
          ] as const
        ).map(([key, value, align]) => (
          <span key={key} className={cx("flex flex-col", align)}>
            <span className="text-char-500">{t(key)}</span>
            <bdi className="font-medium whitespace-nowrap">{formatGrams(value, locale)}</bdi>
          </span>
        ))}
      </div>
      <p
        role="status"
        className={cx(
          "text-sm font-medium",
          tone === "bad" ? "text-bad-600" : tone === "warn" ? "text-warn-600" : tone === "ok" ? "text-ok-600" : "text-char-700",
        )}
      >
        {sentence}
      </p>
    </div>
  );
}
