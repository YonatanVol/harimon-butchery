"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { cx } from "../cx";

export const CART_CHANGED_EVENT = "cart:changed";

/** Tells the header the cart changed. Pass the new count when known to skip a round trip. */
export function announceCartChange(count?: number) {
  window.dispatchEvent(new CustomEvent(CART_CHANGED_EVENT, { detail: { count } }));
}

/** The cart's item count, kept in step with every add/remove on the page. */
export function useCartCount() {
  const [count, setCount] = useState<number | null>(null);
  const [bumped, setBumped] = useState(0);

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
      setBumped((n) => n + 1);
      if (typeof next === "number") setCount(next);
      else load();
    };
    window.addEventListener(CART_CHANGED_EVENT, onChange);
    return () => {
      cancelled = true;
      window.removeEventListener(CART_CHANGED_EVENT, onChange);
    };
  }, []);

  return { count, bumped };
}

export const CartIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
    <path d="M5 8h14l-1.2 11.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8Z" />
    <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
  </svg>
);

/** Header cart link: "Cart (2)", the count bumps when something is added. */
export function CartButton() {
  const t = useTranslations("shop.cart");
  const { count, bumped } = useCartCount();
  const label = count ? t("openWithCount", { count }) : t("open");

  return (
    <Link
      href="/cart"
      aria-label={label}
      className="hover:bg-bone-200 relative inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-medium"
    >
      <CartIcon className="size-5" />
      <span>{t("open")}</span>
      {count ? (
        <span
          key={bumped}
          className="bg-char-900 text-bone-50 grid min-w-5 place-items-center rounded-full px-1.5 text-xs font-semibold tabular-nums motion-safe:animate-[bump_0.45s_ease-out]"
        >
          {count}
        </span>
      ) : null}
    </Link>
  );
}

export function CartCountBadge({ className }: { className?: string }) {
  const { count, bumped } = useCartCount();
  if (!count) return null;
  return (
    <span
      key={bumped}
      className={cx(
        "bg-char-900 text-bone-50 grid min-w-4.5 place-items-center rounded-full px-1 text-[11px] leading-[18px] font-semibold tabular-nums motion-safe:animate-[bump_0.45s_ease-out]",
        className,
      )}
    >
      {count}
    </span>
  );
}
