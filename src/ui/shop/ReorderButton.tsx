"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";
import { reorder } from "@/infra/orders/actions";
import type { ReorderLine } from "@/infra/orders/reorder";
import { Button } from "../primitives/Button";
import { announceCartChange } from "./CartButton";
import { useProblemText } from "./useProblemText";

/**
 * "Order this again". Everything that could go in the cart does, and anything that could not is named
 * with its reason — a sold-out cut must not disappear from the list without a word.
 */
export function ReorderButton({ orderNumber, accessToken, variant = "secondary" }: { orderNumber: string; accessToken?: string; variant?: "primary" | "secondary" }) {
  const t = useTranslations("shop.reorder");
  const locale = useLocale();
  const he = locale === "he";
  const problemText = useProblemText();
  const [pending, start] = useTransition();
  const [added, setAdded] = useState<number | null>(null);
  const [skipped, setSkipped] = useState<ReorderLine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  const run = () => {
    if (busy.current) return;
    busy.current = true;
    setError(null);
    setAdded(null);
    setSkipped([]);
    start(async () => {
      try {
        const r = await reorder({ orderNumber, accessToken, locale });
        if (!r.ok) {
          if (r.problem.key === "NOTHING_TO_ADD") {
            setSkipped(r.problem.lines);
            setError(t("nothing"));
          } else {
            setError(t("notFound"));
          }
          return;
        }
        announceCartChange(r.count);
        setAdded(r.lines.filter((l) => l.added).length);
        setSkipped(r.lines.filter((l) => !l.added));
      } catch {
        setError(problemText({ key: "NETWORK" }));
      } finally {
        busy.current = false;
      }
    });
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <Button variant={variant} size="md" pendingLabel={pending ? t("adding") : null} onClick={run}>
        {t("cta")}
      </Button>

      {added !== null && (
        <p role="status" className="text-ok-600 text-sm font-medium">
          {t("added", { count: added })}
        </p>
      )}
      {error && (
        <p role="alert" className="text-bad-600 text-sm font-medium">
          {error}
        </p>
      )}
      {skipped.length > 0 && (
        <ul className="text-char-700 flex flex-col gap-1 text-sm">
          {skipped.map((l) => (
            <li key={l.slug}>
              {t("skipped", { name: he ? l.nameHe : l.nameEn })} {l.problem ? problemText(l.problem) : ""}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
