"use client";

import { useLocale } from "next-intl";
import { formatGrams, type Grams } from "@/domain/weight/grams";
import type { Locale } from "@/i18n/routing";
import { cx } from "../cx";

/** A weight ("2.5 ק״ג", "750 גר׳"), bidi-isolated. */
export function Weight({ value, className }: { value: Grams; className?: string }) {
  const locale = useLocale() as Locale;
  return (
    <bdi className={cx("tabular-nums whitespace-nowrap", className)}>
      {formatGrams(value, locale)}
    </bdi>
  );
}
