"use client";

import { useLocale, useTranslations } from "next-intl";
import { formatGrams, grams } from "@/domain/weight/grams";
import type { Locale } from "@/i18n/routing";
import type { ActionProblem } from "@/infra/cart/actions";

/** One sentence for any action problem, in the current language. */
export function useProblemText() {
  const t = useTranslations("shop.problems");
  const locale = useLocale() as Locale;
  const g = (n: number) => formatGrams(grams(n), locale);

  return (problem: ActionProblem | { key: "NETWORK" }): string => {
    switch (problem.key) {
      case "BELOW_MIN":
        return t("BELOW_MIN", { min: g(problem.minG) });
      case "ABOVE_MAX":
        return t("ABOVE_MAX", { max: g(problem.maxG) });
      case "OFF_STEP":
        return t("OFF_STEP", { step: g(problem.stepG) });
      case "NOT_ENOUGH_STOCK":
        return t("NOT_ENOUGH_STOCK", { available: g(problem.availableG) });
      case "QUANTITY_RANGE":
        return t("QUANTITY_RANGE", { max: problem.max });
      case "NOT_ENOUGH_UNITS":
        return t("NOT_ENOUGH_UNITS", { available: problem.available });
      case "CITY_NOT_SERVED":
      case "ZONE_PAUSED":
        return t(problem.key, { city: problem.city });
      case "SLOT_CLOSED":
        return t("SLOT_CLOSED", { reason: locale === "he" ? problem.reasonHe : problem.reasonEn });
      case "SLOT_TOO_SOON":
        return t("SLOT_TOO_SOON", { hours: Math.round(problem.leadMinutes / 60) });
      default:
        return t(problem.key);
    }
  };
}
