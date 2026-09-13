"use client";

import { type AbstractIntlMessages, NextIntlClientProvider, useLocale, useTranslations } from "next-intl";
import { type ReactNode, useState } from "react";
import { agorot } from "@/domain/money/agorot";
import { formatAgorot } from "@/domain/money/format";
import { quoteOrder } from "@/domain/order/totals";
import { formatGrams, grams } from "@/domain/weight/grams";
import { PRICE_FOR_WEIGHT_VECTORS } from "@/domain/weight/reference-vectors";
import { priceForWeight } from "@/domain/weight/reprice";
import { DEFAULT_TOLERANCE_BP, toleranceBounds } from "@/domain/weight/tolerance";
import type { Locale } from "@/i18n/routing";
import { cx } from "@/ui/cx";
import { Badge } from "@/ui/primitives/Badge";
import { Button } from "@/ui/primitives/Button";
import { Money } from "@/ui/primitives/Money";
import { Skeleton } from "@/ui/primitives/Skeleton";
import { ToleranceBar } from "@/ui/primitives/ToleranceBar";
import { WeightStepper } from "@/ui/primitives/WeightStepper";

type View = "both" | "rtl" | "ltr";

export function KitchenSink({ messages }: { messages: Record<Locale, AbstractIntlMessages> }) {
  const [view, setView] = useState<View>("both");
  const pageLocale = useLocale() as Locale;
  const t = useTranslations("kitchenSink");

  const panels: Array<{ locale: Locale; dir: "rtl" | "ltr" }> = [
    { locale: "he", dir: "rtl" },
    { locale: "en", dir: "ltr" },
  ];
  const visible = panels.filter((p) => view === "both" || p.dir === view);

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="text-char-700 font-reading">{t("intro")}</p>
        </div>
        <div role="radiogroup" aria-label={t("layout")} className="bg-bone-200 flex rounded-lg p-1">
          {(["both", "rtl", "ltr"] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={view === v}
              onClick={() => setView(v)}
              className={cx(
                "min-h-11 rounded-md px-4 text-sm font-medium",
                view === v ? "bg-bone-50 shadow-sm" : "text-char-700 hover:text-char-900",
              )}
            >
              {t(v === "both" ? "both" : v === "rtl" ? "rtlOnly" : "ltrOnly")}
            </button>
          ))}
        </div>
      </header>

      <div className={cx("grid gap-6", view === "both" && "lg:grid-cols-2")} dir={pageLocale === "he" ? "rtl" : "ltr"}>
        {visible.map((p) => (
          <section
            key={p.locale}
            dir={p.dir}
            lang={p.locale}
            className="border-bone-300 bg-bone-50 rounded-2xl border p-6 shadow-sm"
          >
            <NextIntlClientProvider locale={p.locale} messages={messages[p.locale]} timeZone="Asia/Jerusalem">
              <Panel />
            </NextIntlClientProvider>
          </section>
        ))}
      </div>
    </main>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-bone-200 flex flex-col gap-3 border-b pb-6 last:border-b-0 last:pb-0">
      <h2 className="text-char-500 text-xs font-semibold tracking-wider uppercase">{title}</h2>
      {children}
    </div>
  );
}

function Panel() {
  const t = useTranslations("kitchenSink");
  const locale = useLocale() as Locale;

  const pricePerKg = agorot(16900);
  const [requested, setRequested] = useState(grams(2500));
  const quote = quoteOrder([
    { mode: "WEIGHT", pricePerKg, requested, toleranceBp: DEFAULT_TOLERANCE_BP },
  ]);
  const bounds = toleranceBounds(grams(2500), DEFAULT_TOLERANCE_BP);
  const percent = new Intl.NumberFormat(locale === "he" ? "he-IL" : "en-IL", { style: "percent" }).format(
    DEFAULT_TOLERANCE_BP / 10000,
  );

  return (
    <div className="flex flex-col gap-6">
      <Block title={t("buttons")}>
        <div className="flex flex-wrap items-start gap-3">
          <Button>{t("primary")}</Button>
          <Button variant="secondary">{t("secondary")}</Button>
          <Button variant="ghost">{t("ghost")}</Button>
          <Button variant="danger">{t("danger")}</Button>
        </div>
        <div className="flex flex-wrap items-start gap-3">
          <Button disabledReason={t("disabledReason")}>{t("disabledExample")}</Button>
          <Button pendingLabel={t("pending")}>{t("primary")}</Button>
        </div>
        <Button size="xl" fullWidth>
          {t("tablet")} · <Money value={agorot(38700)} />
        </Button>
      </Block>

      <Block title={t("badges")}>
        <div className="flex flex-wrap gap-2">
          <Badge tone="wine">{t("badgeGlatt")}</Badge>
          <Badge>{t("badgeBassari")}</Badge>
          <Badge tone="ok">{t("badgeInStock")}</Badge>
          <Badge tone="warn">{t("badgeLow")}</Badge>
          <Badge tone="bad">{t("badgeOut")}</Badge>
        </div>
      </Block>

      <Block title={t("stepper")}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <WeightStepper
            label={t("stepperLabel")}
            value={requested}
            min={grams(500)}
            max={grams(5000)}
            step={grams(250)}
            onChange={setRequested}
          />
          <div className="text-end">
            <div className="text-char-500 text-xs">{t("estimate")}</div>
            <Money value={quote.estimateTotal} className="text-2xl font-semibold" />
          </div>
        </div>
        <p className="text-char-700 font-reading text-sm">
          {t("hold", { hold: formatAgorot(quote.authorizationCeiling, locale), tolerance: percent })}
        </p>
      </Block>

      <Block title={t("toleranceTitle")}>
        <ul className="flex flex-col gap-3">
          {[null, 2500, 2625, 2750, 2875, 2100].map((g) => (
            <li key={g ?? "none"} className="bg-bone-100 flex flex-col gap-2 rounded-xl p-4">
              <span className="text-char-500 text-xs">
                {t("colActual")}: <bdi>{g === null ? "—" : formatGrams(grams(g), locale)}</bdi>
              </span>
              <ToleranceBar bounds={bounds} actual={g === null ? null : grams(g)} />
            </li>
          ))}
        </ul>
      </Block>

      <Block title={t("vectorsTitle")}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm tabular-nums">
            <thead className="text-char-500 text-start text-xs">
              <tr>
                <th className="py-1 text-start font-medium">{t("colWeight")}</th>
                <th className="py-1 text-start font-medium">{t("colPrice")}</th>
                <th className="py-1 text-start font-medium">{t("colExpected")}</th>
                <th className="py-1 text-start font-medium">{t("colActual")}</th>
                <th className="py-1 text-start font-medium">{t("colOk")}</th>
              </tr>
            </thead>
            <tbody>
              {PRICE_FOR_WEIGHT_VECTORS.map((v) => {
                const actual = priceForWeight(agorot(v.pricePerKgAgorot), grams(v.grams));
                const ok = actual === v.expectedAgorot;
                return (
                  <tr key={`${v.grams}-${v.pricePerKgAgorot}`} className="border-bone-200 border-t">
                    <td className="py-1.5">
                      <bdi>{formatGrams(grams(v.grams), locale)}</bdi>
                    </td>
                    <td className="py-1.5">
                      <Money value={agorot(v.pricePerKgAgorot)} />
                    </td>
                    <td className="py-1.5">
                      <Money value={agorot(v.expectedAgorot)} />
                    </td>
                    <td className="py-1.5">
                      <Money value={actual} />
                    </td>
                    <td className={cx("py-1.5 font-semibold", ok ? "text-ok-600" : "text-bad-600")}>
                      {ok ? "✓" : "✗"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Block>

      <Block title={t("skeleton")}>
        <div className="flex gap-4">
          <Skeleton className="size-20" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-1/4" />
          </div>
        </div>
      </Block>
    </div>
  );
}
