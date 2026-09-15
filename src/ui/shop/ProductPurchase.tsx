"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { formatGrams, grams } from "@/domain/weight/grams";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { addToCart } from "@/infra/cart/actions";
import { cx } from "../cx";
import { Button } from "../primitives/Button";
import { InterestForm } from "./InterestForm";
import { announceCartChange } from "./CartButton";
import { type PurchaseProduct, PurchasePanel, type PurchaseSelection } from "./PurchasePanel";
import { useProblemText } from "./useProblemText";

/**
 * The product page's buy box: the purchase panel plus a real add-to-cart with visible outcomes.
 * When the panel's button scrolls out of view, the same total and button follow at the bottom of the screen
 * (above the phone tab bar) — one control, one state, never a second place to choose from.
 */
export function ProductPurchase({ product, outOfStockLabel }: { product: PurchaseProduct; outOfStockLabel: string }) {
  const t = useTranslations("shop");
  const locale = useLocale() as Locale;
  const problemText = useProblemText();
  const [pending, startTransition] = useTransition();
  const [added, setAdded] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const confirmRef = useRef<HTMLDivElement>(null);
  const inlineRef = useRef<HTMLDivElement>(null);
  const [inlineVisible, setInlineVisible] = useState(true);
  const [footerVisible, setFooterVisible] = useState(false);
  const name = locale === "he" ? product.nameHe : product.nameEn;
  const out = product.availability.kind === "OUT";

  useEffect(() => {
    const el = inlineRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setInlineVisible(entry.isIntersecting), { rootMargin: "0px 0px -80px 0px" });
    io.observe(el);
    // At the end of the page the bar steps aside so it never covers the footer's last lines.
    const footer = document.querySelector("footer");
    const fo = footer ? new IntersectionObserver(([entry]) => setFooterVisible(entry.isIntersecting)) : null;
    if (footer && fo) fo.observe(footer);
    return () => {
      io.disconnect();
      fo?.disconnect();
    };
  }, []);
  const hideBar = inlineVisible || footerVisible;

  const busy = useRef(false);
  const add = (selection: PurchaseSelection) => {
    // One request at a time: a second tap while the first is still running would add the amount twice.
    if (busy.current) return;
    busy.current = true;
    setError(null);
    setAdded(null);
    startTransition(async () => {
      try {
        const result = await addToCart({ ...selection, locale });
        if (!result.ok) {
          setError(problemText(result.problem));
          inlineRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
          return;
        }
        announceCartChange(result.count);
        const amount =
          selection.requestedG !== null ? formatGrams(grams(selection.requestedG), locale) : `× ${selection.quantity}`;
        setAdded(t("cart.addedBody", { amount, name }));
        requestAnimationFrame(() => confirmRef.current?.focus());
      } catch {
        setError(problemText({ key: "NETWORK" }));
      } finally {
        busy.current = false;
      }
    });
  };

  return (
    <PurchasePanel
      product={product}
      outOfStockLabel={outOfStockLabel}
      renderAction={(selection, disabledReason, summary) => (
        <div className="flex flex-col gap-3">
          <div ref={inlineRef}>
            <Button
              size="lg"
              fullWidth
              disabledReason={disabledReason}
              pendingLabel={pending ? t("cart.adding") : null}
              onClick={() => add(selection)}
            >
              {t("product.addToCart")}
            </Button>
          </div>
          {disabledReason && out && <InterestForm target={{ kind: "RESTOCK", productId: product.id, productName: name }} />}
          {error && (
            <p role="alert" className="bg-bad-600/10 text-bad-600 rounded-[2px] p-3 text-sm font-medium">
              {error}
            </p>
          )}
          {added && (
            <div
              ref={confirmRef}
              tabIndex={-1}
              role="status"
              className="border-ok-600/30 bg-bone-50 flex flex-wrap items-center justify-between gap-3 border p-4 outline-none"
            >
              <div>
                <p className="text-ok-600 text-sm font-semibold">{t("cart.added")}</p>
                <p className="font-medium">{added}</p>
              </div>
              <div className="flex gap-2">
                <Link
                  href="/cart"
                  className="bg-char-900 text-bone-50 inline-flex min-h-11 items-center rounded-[2px] px-5 text-sm font-semibold"
                >
                  {t("cart.goToCart")}
                </Link>
                <button
                  type="button"
                  onClick={() => setAdded(null)}
                  className="ring-char-900/25 inline-flex min-h-11 items-center rounded-[2px] px-4 text-sm font-medium ring-1 ring-inset"
                >
                  {t("cart.keepShopping")}
                </button>
              </div>
            </div>
          )}

          {!out && (
            <div
              aria-hidden={hideBar}
              inert={hideBar}
              className={cx(
                "bg-bone-100/95 border-bone-300 px-safe fixed inset-x-0 z-30 border-t backdrop-blur-md transition-[translate,opacity] duration-300 lg:hidden",
                "bottom-[calc(3.5rem+env(safe-area-inset-bottom))] md:bottom-0 md:pb-safe",
                hideBar ? "pointer-events-none translate-y-4 opacity-0" : "translate-y-0 opacity-100",
              )}
            >
              <div className="mx-auto flex max-w-2xl items-center gap-4 px-4 py-2.5">
                <div className="min-w-0 shrink-0">
                  <bdi className="block text-lg leading-tight font-semibold tabular-nums">{summary.total}</bdi>
                  <span className="text-char-500 block truncate text-xs">
                    {summary.isEstimate ? t("product.estimate") : t("product.exact")} · {name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => add(selection)}
                  aria-busy={pending || undefined}
                  aria-disabled={pending || undefined}
                  className="bg-char-900 text-bone-50 hover:bg-char-800 min-h-12 flex-1 rounded-[2px] px-4 text-[15px] font-semibold"
                >
                  {pending ? t("cart.adding") : t("product.addToCart")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    />
  );
}
