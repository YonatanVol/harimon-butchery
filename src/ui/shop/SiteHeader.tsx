import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { brand } from "@/config/brand";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { listCategories } from "@/infra/db/queries/catalog";
import { CartButton } from "./CartButton";
import { LocaleSwitch } from "./LocaleSwitch";

export async function SiteHeader() {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("shop.nav");
  const categories = await listCategories();

  return (
    <header className="bg-bone-50/90 sticky top-0 z-30 border-b border-bone-300 backdrop-blur">
      <a
        href="#main"
        className="bg-char-900 text-bone-50 sr-only start-0 top-0 z-50 rounded-md focus:not-sr-only focus:absolute focus:start-3 focus:top-3 focus:px-3 focus:py-2"
      >
        {t("skipToContent")}
      </a>
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 py-3 sm:gap-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2" aria-label={`${brand.name[locale]} — ${t("home")}`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- tiny static SVG mark */}
          <img src="/icon.svg" alt="" width={32} height={32} className="size-8" />
          <span className="text-base font-bold tracking-tight whitespace-nowrap sm:text-lg">{brand.name[locale]}</span>
        </Link>

        <form action={`/${locale}/search`} role="search" className="ms-auto hidden max-w-sm flex-1 md:block">
          <label htmlFor="site-search" className="sr-only">
            {t("search")}
          </label>
          <input
            id="site-search"
            name="q"
            type="search"
            placeholder={t("searchPlaceholder")}
            className="bg-bone-100 placeholder:text-char-500 focus:bg-bone-50 focus:ring-wine-500 min-h-11 w-full rounded-full border border-bone-300 px-4 text-sm outline-none focus:ring-2"
          />
        </form>

        <div className="ms-auto flex items-center gap-1 sm:gap-2 md:ms-0">
          <Link
            href="/search"
            className="hover:bg-bone-200 grid size-11 place-items-center rounded-full md:hidden"
            aria-label={t("search")}
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </Link>
          <Suspense
            fallback={
              <a
                href={`/${locale === "he" ? "en" : "he"}`}
                aria-label={t("switchLocaleLabel")}
                className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-medium"
              >
                <span className="sm:hidden">{t("switchLocaleShort")}</span>
                <span className="hidden sm:inline">{t("switchLocale")}</span>
              </a>
            }
          >
            <LocaleSwitch label={t("switchLocale")} shortLabel={t("switchLocaleShort")} ariaLabel={t("switchLocaleLabel")} />
          </Suspense>
          <Link href="/account" className="hover:bg-bone-200 grid size-11 place-items-center rounded-full" aria-label={t("account")}>
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
            </svg>
          </Link>
          <CartButton />
        </div>
      </div>

      <nav aria-label={t("categories")} className="border-t border-bone-200">
        <ul className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-1.5 [scrollbar-width:none] sm:px-6">
          {categories.map((c) => (
            <li key={c.id} className="shrink-0">
              <Link
                href={`/c/${c.slug}`}
                className="text-char-700 hover:bg-bone-200 hover:text-char-900 inline-flex min-h-10 items-center rounded-full px-3 text-sm font-medium whitespace-nowrap"
              >
                {locale === "he" ? c.nameHe : c.nameEn}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
