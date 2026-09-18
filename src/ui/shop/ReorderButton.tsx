"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";
import { formatGrams, grams } from "@/domain/weight/grams";
import type { Locale } from "@/i18n/routing";
import { reorder } from "@/infra/orders/actions";
import type { ReorderLine } from "@/infra/orders/reorder";
import { Button } from "../primitives/Button";
import { announceCartChange } from "./CartButton";
import { useProblemText } from "./useProblemText";

/**
 * "Order this again". The cuts of a past order are set in the cart — pressing twice leaves the same cart
 * as pressing once — and anything that could not go in, or whose weight had to change, is named.
 */
export function ReorderButton({ orderNumber, accessToken, variant = "secondary" }: { orderNumber: string; accessToken?: string; variant?: "primary" | "secondary" }) {
  const t = useTranslations("shop.reorder");
  const locale = useLocale() as Locale;
  const he = locale === "he";
  const problemText = useProblemText();
  const [pending, start] = useTransition();
  const [done, setDone] = useState<{ added: number; lines: ReorderLine[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  const nameOf = (l: ReorderLine) => {
    const product = he ? l.nameHe : l.nameEn;
    const cut = he ? l.variantNameHe : l.variantNameEn;
    return cut ? `${product} · ${cut}` : product;
  };

  const run = () => {
    if (busy.current) return;
    busy.current = true;
    setError(null);
    setDone(null);
    start(async () => {
      try {
        const r = await reorder({ orderNumber, accessToken, locale });
        if (!r.ok) {
          if (r.problem.key === "NOTHING_TO_ADD") {
            setDone({ added: 0, lines: r.problem.lines });
            setError(t("nothing"));
          } else {
            setError(t(r.problem.key === "NOTHING_ARRIVED" ? "nothingArrived" : "notFound"));
          }
          return;
        }
        announceCartChange(r.count);
        setDone({ added: r.lines.filter((l) => l.added).length, lines: r.lines });
      } catch {
        setError(problemText({ key: "NETWORK" }));
      } finally {
        busy.current = false;
      }
    });
  };

  const notes = (done?.lines ?? []).filter((l) => !l.added || l.changed);

  return (
    <div className="flex flex-col items-start gap-2">
      <Button variant={variant} size="md" pendingLabel={pending ? t("adding") : null} onClick={run}>
        {t("cta")}
      </Button>

      {done && done.added > 0 && (
        <p role="status" className="text-ok-600 text-sm font-medium">
          {t("added", { count: done.added })}
        </p>
      )}
      {error && (
        <p role="alert" className="text-bad-600 text-sm font-medium">
          {error}
        </p>
      )}
      {notes.length > 0 && (
        <ul className="text-char-700 flex flex-col gap-1 text-sm">
          {notes.map((l) => (
            <li key={l.variantId}>
              {l.added && l.changed
                ? t("changed", { name: nameOf(l), from: formatGrams(grams(l.changed.fromG), locale), to: formatGrams(grams(l.changed.toG), locale) })
                : `${t("skipped", { name: nameOf(l) })} ${l.problem ? problemText(l.problem) : ""}`}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
