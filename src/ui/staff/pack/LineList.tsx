"use client";

import { useLocale, useTranslations } from "next-intl";
import { formatGrams, grams } from "@/domain/weight/grams";
import type { Locale } from "@/i18n/routing";
import type { PackLine } from "@/infra/orders/packView";
import { cx } from "../../cx";

const mark: Record<string, string> = { PENDING: "○", WEIGHED: "✓", SHORT: "✗", SUBSTITUTED: "↻", CANCELLED: "–", REFUNDED: "–" };

export function LineList({ lines, activeId, onSelect }: { lines: PackLine[]; activeId: string | null; onSelect: (id: string) => void }) {
  const t = useTranslations("staff.pack");
  const locale = useLocale() as Locale;

  return (
    <ol className="flex flex-col gap-2" aria-label={t("lines")}>
      {lines.map((l) => {
        const active = l.id === activeId;
        return (
          <li key={l.id}>
            <button
              type="button"
              onClick={() => onSelect(l.id)}
              aria-current={active ? "true" : undefined}
              className={cx(
                "flex min-h-18 w-full items-center gap-3 rounded-2xl px-4 py-3 text-start ring-1",
                active ? "bg-char-900 text-bone-50 ring-char-900" : "bg-bone-50 ring-bone-300",
                l.status === "SHORT" || l.status === "SUBSTITUTED" ? "opacity-60" : "",
              )}
            >
              <span
                aria-hidden
                className={cx(
                  "grid size-9 shrink-0 place-items-center rounded-full text-lg font-bold",
                  l.status === "WEIGHED" ? "bg-ok-600 text-bone-50" : l.status === "PENDING" ? (active ? "bg-bone-50/20" : "bg-bone-200") : "bg-char-500 text-bone-50",
                )}
              >
                {mark[l.status]}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-lg font-semibold">{locale === "he" ? l.nameHe : l.nameEn}</span>
                <span className={cx("block text-sm", active ? "text-bone-300" : "text-char-500")}>
                  {l.pricingMode === "WEIGHT" ? (
                    <bdi>
                      {formatGrams(grams(l.estimatedG!), locale)}
                      {l.actualG ? ` → ${formatGrams(grams(l.actualG), locale)}` : ""}
                    </bdi>
                  ) : (
                    t("package", { count: l.quantity ?? 0 })
                  )}{" "}
                  · {t(`status.${l.status}`)}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
