"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";

export const CART_CHANGED_EVENT = "cart:changed";

/** Tells the header the cart changed. Pass the new count when known to skip a round trip. */
export function announceCartChange(count?: number) {
  window.dispatchEvent(new CustomEvent(CART_CHANGED_EVENT, { detail: { count } }));
}

export function CartButton() {
  const t = useTranslations("shop.cart");
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      fetch("/api/cart", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { count: number } | null) => {
          if (!cancelled && data) setCount(data.count);
        })
        .catch(() => {});
    load();
    const onChange = (e: Event) => {
      const next = (e as CustomEvent<{ count?: number }>).detail?.count;
      if (typeof next === "number") setCount(next);
      else load();
    };
    window.addEventListener(CART_CHANGED_EVENT, onChange);
    return () => {
      cancelled = true;
      window.removeEventListener(CART_CHANGED_EVENT, onChange);
    };
  }, []);

  const label = count ? t("openWithCount", { count }) : t("open");

  return (
    <Link
      href="/cart"
      aria-label={label}
      className="bg-char-900 text-bone-50 hover:bg-char-800 relative inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-medium"
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6" />
        <circle cx="10" cy="20" r="1.3" />
        <circle cx="17" cy="20" r="1.3" />
      </svg>
      <span className="hidden sm:inline">{t("open")}</span>
      {count ? (
        <span className="bg-wine-500 grid min-w-5 place-items-center rounded-full px-1.5 text-xs font-bold tabular-nums">
          {count}
        </span>
      ) : null}
    </Link>
  );
}
