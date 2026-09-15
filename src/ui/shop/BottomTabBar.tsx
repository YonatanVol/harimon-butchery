"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { cx } from "../cx";
import { CartCountBadge, CartIcon } from "./CartButton";

const icon = (d: ReactNode) => (
  <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {d}
  </svg>
);

/**
 * Phone navigation within thumb reach: home, cut guide, recipes, account, cart.
 * Sits above the iPhone home indicator and the Android gesture bar; hidden from tablet width up.
 */
export function BottomTabBar() {
  const t = useTranslations("shop.nav");
  const pathname = usePathname();
  const is = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  const tabs: { href: string; label: string; icon: ReactNode; badge?: boolean }[] = [
    { href: "/", label: t("tabHome"), icon: icon(<path d="M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1Z" />) },
    { href: "/cuts", label: t("tabCuts"), icon: icon(<><path d="M4 14c0-4 3.5-8 9-8 4 0 7 2.5 7 6s-3 6-7 6H8a4 4 0 0 1-4-4Z" /><circle cx="14.5" cy="11.5" r="1.8" /></>) },
    { href: "/recipes", label: t("tabRecipes"), icon: icon(<><path d="M6 4h10a2 2 0 0 1 2 2v14H8a2 2 0 0 1-2-2Z" /><path d="M6 18a2 2 0 0 1 2-2h10M10 8h5M10 11h5" /></>) },
    { href: "/account", label: t("tabAccount"), icon: icon(<><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20c1.3-3.5 4-5.2 7-5.2s5.7 1.7 7 5.2" /></>) },
    { href: "/cart", label: t("tabCart"), icon: <CartIcon className="size-6" />, badge: true },
  ];

  return (
    <nav
      aria-label={t("tabBar")}
      className="bg-bone-50/92 border-bone-300 pb-safe fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur-md md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {tabs.map((tab) => {
          const active = is(tab.href);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
                  active ? "text-char-900" : "text-char-500",
                )}
              >
                <span className="relative">
                  {tab.icon}
                  {tab.badge && <CartCountBadge className="absolute -top-1.5 -end-2.5" />}
                </span>
                <span>{tab.label}</span>
                {active && <span aria-hidden className="bg-brass-500 absolute top-0 h-0.5 w-6 rounded-full" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
