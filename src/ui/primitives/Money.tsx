"use client";

import { useLocale } from "next-intl";
import type { Agorot } from "@/domain/money/agorot";
import { formatAgorot } from "@/domain/money/format";
import type { Locale } from "@/i18n/routing";
import { cx } from "../cx";

/** A shekel amount, bidi-isolated so it never reorders surrounding Hebrew text. */
export function Money({ value, className }: { value: Agorot; className?: string }) {
  const locale = useLocale() as Locale;
  return (
    <bdi className={cx("tabular-nums whitespace-nowrap", className)}>
      {formatAgorot(value, locale)}
    </bdi>
  );
}
