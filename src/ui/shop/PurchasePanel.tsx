"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import type { Availability } from "@/domain/catalog/availability";
import { orderableMaxG } from "@/domain/catalog/availability";
import { agorot } from "@/domain/money/agorot";
import { formatAgorot } from "@/domain/money/format";
import { quoteOrder } from "@/domain/order/totals";
import { formatGrams, grams } from "@/domain/weight/grams";
import type { Locale } from "@/i18n/routing";
import { cx } from "../cx";
import { QuantityStepper } from "../primitives/QuantityStepper";
import { WeightStepper } from "../primitives/WeightStepper";

export interface PurchaseProduct {
  id: string;
  nameHe: string;
  nameEn: string;
  pricingMode: "WEIGHT" | "PACKAGE";
  pricePerKgAgorot: number | null;
  minOrderG: number | null;
  maxOrderG: number | null;
  stepG: number | null;
  defaultOrderG: number | null;
  toleranceBp: number;
  avgPieceG: number | null;
  packagePriceAgorot: number | null;
  variants: Array<{
    id: string;
    nameHe: string;
    nameEn: string;
    priceDeltaAgorot: number;
    isDefault: boolean;
  }>;
  availability: Availability;
}

export interface PurchaseSelection {
  variantId: string;
  requestedG: number | null;
  quantity: number | null;
  note: string;
}

/** What the sticky buy bar repeats: the running total and whether it is an estimate. */
export interface PurchaseSummary {
  total: string;
  isEstimate: boolean;
}

const MAX_PACKAGES_PER_ORDER = 10;

export function PurchasePanel({
  product: p,
  outOfStockLabel,
  renderAction,
}: {
  product: PurchaseProduct;
  outOfStockLabel: string;
  renderAction?: (selection: PurchaseSelection, disabledReason: string | null, summary: PurchaseSummary) => React.ReactNode;
}) {
  const t = useTranslations("shop.product");
  const locale = useLocale() as Locale;
  const name = locale === "he" ? p.nameHe : p.nameEn;
  const out = p.availability.kind === "OUT";
  const availableG = p.availability.kind === "OUT" ? 0 : p.availability.availableG;
  const availableUnits = p.availability.kind === "OUT" ? 0 : p.availability.availableUnits;

  const defaultVariant = p.variants.find((v) => v.isDefault) ?? p.variants[0];
  const [variantId, setVariantId] = useState(defaultVariant.id);
  const variant = p.variants.find((v) => v.id === variantId) ?? defaultVariant;
  const [note, setNote] = useState("");

  // Weight mode
  const min = p.minOrderG ?? 0;
  const step = p.stepG ?? 250;
  const stockMax = p.pricingMode === "WEIGHT" ? orderableMaxG(p.maxOrderG ?? 0, step, min, availableG) : 0;
  const cappedByStock = stockMax < (p.maxOrderG ?? 0);
  const [requested, setRequested] = useState(() =>
    grams(Math.max(min, Math.min(p.defaultOrderG ?? min, stockMax || min))),
  );

  // Package mode
  const unitMax = Math.min(MAX_PACKAGES_PER_ORDER, availableUnits);
  const [quantity, setQuantity] = useState(1);

  const quote =
    p.pricingMode === "WEIGHT"
      ? quoteOrder([
          {
            mode: "WEIGHT",
            pricePerKg: agorot(p.pricePerKgAgorot! + variant.priceDeltaAgorot),
            requested,
            toleranceBp: p.toleranceBp,
          },
        ])
      : quoteOrder([
          { mode: "PACKAGE", unitPrice: agorot(p.packagePriceAgorot! + variant.priceDeltaAgorot), quantity },
        ]);

  const percent = new Intl.NumberFormat(locale === "he" ? "he-IL" : "en-IL", { style: "percent" }).format(
    p.toleranceBp / 10000,
  );
  const pieces = p.avgPieceG ? Math.max(1, Math.round(requested / p.avgPieceG)) : null;

  const selection: PurchaseSelection = {
    variantId,
    requestedG: p.pricingMode === "WEIGHT" ? requested : null,
    quantity: p.pricingMode === "PACKAGE" ? quantity : null,
    note: note.trim(),
  };

  return (
    <div className="flex flex-col gap-5">
      {p.variants.length > 1 && (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-char-700 mb-2 text-sm font-medium">{t("cut")}</legend>
          <div className="flex flex-wrap gap-2">
            {p.variants.map((v) => {
              const on = v.id === variantId;
              return (
                <label
                  key={v.id}
                  className={cx(
                    "has-focus-visible:outline-wine-600 inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-[2px] px-4 text-sm font-medium ring-1 ring-inset transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2",
                    on ? "bg-char-900 text-bone-50 ring-char-900" : "bg-transparent ring-bone-300 hover:ring-char-900",
                  )}
                >
                  <input
                    type="radio"
                    name="variant"
                    value={v.id}
                    checked={on}
                    onChange={() => setVariantId(v.id)}
                    className="sr-only"
                  />
                  {locale === "he" ? v.nameHe : v.nameEn}
                  {v.priceDeltaAgorot > 0 && (
                    <bdi className={cx("text-xs", on ? "text-bone-300" : "text-char-500")}>
                      {p.pricingMode === "WEIGHT"
                        ? t("priceDelta", { price: formatAgorot(agorot(v.priceDeltaAgorot), locale) })
                        : t("priceDeltaPkg", { price: formatAgorot(agorot(v.priceDeltaAgorot), locale) })}
                    </bdi>
                  )}
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      {!out && (
        <div className="flex flex-col gap-2">
          <span className="text-char-700 text-sm font-medium">{t("quantity")}</span>
          <div className="flex flex-wrap items-start justify-between gap-4">
            {p.pricingMode === "WEIGHT" ? (
              <WeightStepper
                label={t("quantityLabel", { name })}
                value={requested}
                min={grams(min)}
                max={grams(stockMax)}
                step={grams(step)}
                onChange={setRequested}
                maxReason={cappedByStock ? t("maxAvailable", { max: formatGrams(grams(stockMax), locale) }) : undefined}
              />
            ) : (
              <QuantityStepper
                label={t("quantityLabel", { name })}
                value={quantity}
                max={unitMax}
                onChange={setQuantity}
                maxReason={
                  unitMax < MAX_PACKAGES_PER_ORDER
                    ? t("maxAvailable", { max: unitMax })
                    : t("maxPerOrder", { max: MAX_PACKAGES_PER_ORDER })
                }
              />
            )}
            <div className="text-end">
              <div className="text-char-500 text-xs">{quote.hasWeightLines ? t("estimate") : t("exact")}</div>
              <bdi className="font-display block text-4xl tabular-nums">{formatAgorot(quote.estimateTotal, locale)}</bdi>
              {pieces !== null && <span className="text-char-500 text-sm">{t("pieces", { count: pieces })}</span>}
            </div>
          </div>
          <p className="border-bone-300 text-char-700 border-s-2 ps-3 text-sm leading-relaxed">
            {quote.hasWeightLines
              ? t("holdSentence", { hold: formatAgorot(quote.authorizationCeiling, locale), tolerance: percent })
              : t("packageSentence")}
          </p>
        </div>
      )}

      {!out && (
        <label className="flex flex-col gap-1.5">
          <span className="text-char-700 text-sm font-medium">{t("notes")}</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 300))}
            rows={2}
            maxLength={300}
            placeholder={t("notesPlaceholder")}
            className="bg-bone-50 focus:border-char-900 rounded-[2px] border border-bone-300 p-3 text-sm outline-none"
          />
        </label>
      )}

      {renderAction
        ? renderAction(selection, out ? outOfStockLabel : null, {
            total: formatAgorot(quote.estimateTotal, locale),
            isEstimate: quote.hasWeightLines,
          })
        : out && (
            <p role="status" className="bg-bad-600/10 text-bad-600 rounded-lg p-3 font-medium">
              {outOfStockLabel}
            </p>
          )}
    </div>
  );
}
