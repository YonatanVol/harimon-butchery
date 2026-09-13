"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";
import { formatGrams, grams } from "@/domain/weight/grams";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { addToCart } from "@/infra/cart/actions";
import { Button } from "../primitives/Button";
import { announceCartChange } from "./CartButton";
import { type PurchaseProduct, PurchasePanel, type PurchaseSelection } from "./PurchasePanel";
import { useProblemText } from "./useProblemText";

/** The product page's buy box: the purchase panel plus a real add-to-cart with visible outcomes. */
export function ProductPurchase({ product, outOfStockLabel }: { product: PurchaseProduct; outOfStockLabel: string }) {
  const t = useTranslations("shop");
  const locale = useLocale() as Locale;
  const problemText = useProblemText();
  const [pending, startTransition] = useTransition();
  const [added, setAdded] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const confirmRef = useRef<HTMLDivElement>(null);
  const name = locale === "he" ? product.nameHe : product.nameEn;

  const add = (selection: PurchaseSelection) => {
    setError(null);
    setAdded(null);
    startTransition(async () => {
      try {
        const result = await addToCart({ ...selection, locale });
        if (!result.ok) {
          setError(problemText(result.problem));
          return;
        }
        announceCartChange(result.count);
        const amount =
          selection.requestedG !== null ? formatGrams(grams(selection.requestedG), locale) : `× ${selection.quantity}`;
        setAdded(t("cart.addedBody", { amount, name }));
        requestAnimationFrame(() => confirmRef.current?.focus());
      } catch {
        setError(problemText({ key: "NETWORK" }));
      }
    });
  };

  return (
    <PurchasePanel
      product={product}
      outOfStockLabel={outOfStockLabel}
      renderAction={(selection, disabledReason) => (
        <div className="flex flex-col gap-3">
          <Button
            size="lg"
            fullWidth
            disabledReason={disabledReason}
            pendingLabel={pending ? t("cart.adding") : null}
            onClick={() => add(selection)}
          >
            {t("product.addToCart")}
          </Button>
          {error && (
            <p role="alert" className="bg-bad-600/10 text-bad-600 rounded-lg p-3 text-sm font-medium">
              {error}
            </p>
          )}
          {added && (
            <div
              ref={confirmRef}
              tabIndex={-1}
              role="status"
              className="bg-ok-600/10 ring-ok-600/25 flex flex-wrap items-center justify-between gap-3 rounded-xl p-4 ring-1 outline-none"
            >
              <div>
                <p className="text-ok-600 text-sm font-semibold">{t("cart.added")}</p>
                <p className="font-medium">{added}</p>
              </div>
              <div className="flex gap-2">
                <Link
                  href="/cart"
                  className="bg-char-900 text-bone-50 inline-flex min-h-11 items-center rounded-lg px-5 text-sm font-medium"
                >
                  {t("cart.goToCart")}
                </Link>
                <button
                  type="button"
                  onClick={() => setAdded(null)}
                  className="ring-char-900/20 inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-medium ring-1 ring-inset"
                >
                  {t("cart.keepShopping")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    />
  );
}
