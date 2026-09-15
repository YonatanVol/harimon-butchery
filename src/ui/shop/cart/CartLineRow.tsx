"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { agorot } from "@/domain/money/agorot";
import { formatAgorot } from "@/domain/money/format";
import { lineEstimate } from "@/domain/order/totals";
import { grams } from "@/domain/weight/grams";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { removeLine, setLineAmount, setLineSubstitute } from "@/infra/cart/actions";
import { cx } from "../../cx";
import { QuantityStepper } from "../../primitives/QuantityStepper";
import { WeightStepper } from "../../primitives/WeightStepper";
import { announceCartChange } from "../CartButton";
import { ProductImage } from "../ProductImage";
import { useProblemText } from "../useProblemText";

export interface CartLineData {
  id: string;
  productSlug: string;
  nameHe: string;
  nameEn: string;
  variantNameHe: string;
  variantNameEn: string;
  showVariant: boolean;
  animal: "BEEF" | "VEAL" | "LAMB" | "CHICKEN" | "TURKEY" | "MIXED";
  image: string | null;
  pricingMode: "WEIGHT" | "PACKAGE";
  pricePerKgAgorot: number | null;
  unitPriceAgorot: number | null;
  requestedG: number | null;
  quantity: number | null;
  minG: number | null;
  maxG: number | null;
  stepG: number | null;
  toleranceBp: number;
  stockMaxG: number;
  stockMaxUnits: number;
  allowSubstitute: boolean;
  note: string | null;
  unavailable: boolean;
}

const SAVE_DELAY_MS = 450;

export function CartLineRow({ line }: { line: CartLineData }) {
  const t = useTranslations("shop");
  const locale = useLocale() as Locale;
  const problemText = useProblemText();
  const [requested, setRequested] = useState(line.requestedG ?? 0);
  const [quantity, setQuantity] = useState(line.quantity ?? 1);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const [removing, startRemoving] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const name = locale === "he" ? line.nameHe : line.nameEn;

  // Server data wins after a refresh (e.g. another tab changed the cart).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync to fresh server props
    setRequested(line.requestedG ?? 0);
    setQuantity(line.quantity ?? 1);
  }, [line.requestedG, line.quantity]);

  const scheduleSave = (next: { requestedG: number | null; quantity: number | null }) => {
    setError(null);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      startSaving(async () => {
        try {
          const result = await setLineAmount({ lineId: line.id, ...next });
          if (!result.ok) {
            setError(problemText(result.problem));
            setRequested(line.requestedG ?? 0);
            setQuantity(line.quantity ?? 1);
          }
        } catch {
          setError(problemText({ key: "NETWORK" }));
        }
      });
    }, SAVE_DELAY_MS);
  };

  const estimate =
    line.pricingMode === "WEIGHT"
      ? lineEstimate({ mode: "WEIGHT", pricePerKg: agorot(line.pricePerKgAgorot!), requested: grams(requested), toleranceBp: line.toleranceBp })
      : lineEstimate({ mode: "PACKAGE", unitPrice: agorot(line.unitPriceAgorot!), quantity });

  return (
    <li className={cx("flex gap-4 py-5", removing && "opacity-50")}>
      <Link href={`/p/${line.productSlug}`} className="shrink-0" tabIndex={-1} aria-hidden>
        <ProductImage
          src={line.image}
          alt=""
          animal={line.animal}
          label=""
          sizes="96px"
          className={cx("size-20 rounded-[3px] sm:size-24", line.unavailable && "opacity-50")}
        />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <Link href={`/p/${line.productSlug}`} className="font-semibold underline-offset-4 hover:underline">
              {name}
            </Link>
            {line.showVariant && (
              <p className="text-char-700 text-sm">{locale === "he" ? line.variantNameHe : line.variantNameEn}</p>
            )}
            {line.note && <p className="text-char-500 text-sm">{t("cart.note", { note: line.note })}</p>}
          </div>
          {!line.unavailable && (
            <div className="text-end">
              <div className="text-char-500 text-xs">{line.pricingMode === "WEIGHT" ? t("cart.lineEstimate") : t("cart.lineExact")}</div>
              <bdi className="font-semibold tabular-nums">{formatAgorot(estimate, locale)}</bdi>
            </div>
          )}
        </div>

        {line.unavailable ? (
          <p className="bg-bad-600/10 text-bad-600 rounded-[2px] p-2 text-sm font-medium">{t("cart.unavailableLine")}</p>
        ) : (
          <div className="flex flex-wrap items-start gap-x-6 gap-y-1">
            {line.pricingMode === "WEIGHT" ? (
              <WeightStepper
                label={t("product.quantityLabel", { name })}
                value={grams(requested)}
                min={grams(line.minG!)}
                max={grams(Math.min(line.maxG!, line.stockMaxG))}
                step={grams(line.stepG!)}
                onChange={(g) => {
                  setRequested(g);
                  scheduleSave({ requestedG: g, quantity: null });
                }}
              />
            ) : (
              <QuantityStepper
                label={t("product.quantityLabel", { name })}
                value={quantity}
                max={Math.min(10, line.stockMaxUnits)}
                maxReason={t("product.maxAvailable", { max: Math.min(10, line.stockMaxUnits) })}
                onChange={(q) => {
                  setQuantity(q);
                  scheduleSave({ requestedG: null, quantity: q });
                }}
              />
            )}
            <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                defaultChecked={line.allowSubstitute}
                onChange={(e) => {
                  const allow = e.target.checked;
                  startSaving(async () => {
                    const r = await setLineSubstitute(line.id, allow).catch(() => null);
                    if (!r?.ok) setError(r ? problemText(r.problem) : problemText({ key: "NETWORK" }));
                  });
                }}
                className="accent-wine-600 size-5"
                aria-describedby={`sub-hint-${line.id}`}
              />
              {t("cart.substitute")}
            </label>
          </div>
        )}
        {!line.unavailable && (
          <p id={`sub-hint-${line.id}`} className="text-char-500 -mt-1 text-xs">
            {t("cart.substituteHint")}
          </p>
        )}

        <div className="flex items-center gap-3 text-sm">
          <button
            type="button"
            disabled={removing}
            onClick={() =>
              startRemoving(async () => {
                const r = await removeLine(line.id).catch(() => null);
                if (!r?.ok) setError(r ? problemText(r.problem) : problemText({ key: "NETWORK" }));
                else announceCartChange();
              })
            }
            className="text-char-700 hover:text-bad-600 min-h-11 font-medium underline-offset-4 hover:underline"
          >
            {removing ? t("cart.removing") : t("cart.remove")}
          </button>
          {saving && (
            <span role="status" className="text-char-500 text-xs">
              {t("product.saving")}
            </span>
          )}
        </div>
        {error && (
          <p role="alert" className="text-bad-600 text-sm font-medium">
            {error}
          </p>
        )}
      </div>
    </li>
  );
}
