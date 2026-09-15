import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { brand } from "@/config/brand";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { listCategories } from "@/infra/db/queries/catalog";
import { CartButton } from "./CartButton";
import { LocaleSwitch } from "./LocaleSwitch";

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4-4" />
  </svg>
);

/**
 * A quiet counter-top header: section links at the start, the serif wordmark in the middle, tools at the end.
 * On phones the tools shrink to search and language; cart and account move to the bottom tab bar.
 */
export async function SiteHeader() {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("shop.nav");
  const categories = await listCategories();

  const localeFallback = (
    <a
      href={`/${locale === "he" ? "en" : "he"}`}
      aria-label={t("switchLocaleLabel")}
      className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-medium"
    >
      {t("switchLocaleShort")}
    </a>
  );

  return (
    <header className="bg-bone-100/90 px-safe sticky top-0 z-30 backdrop-blur-md [padding-top:env(safe-area-inset-top)]">
      <a
        href="#main"
        className="bg-char-900 text-bone-50 sr-only z-50 rounded-md focus:not-sr-only focus:absolute focus:start-3 focus:top-3 focus:px-3 focus:py-2"
      >
        {t("skipToContent")}
      </a>

      <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-2.5 sm:px-6 md:py-4">
        <nav aria-label={t("sections")} className="hidden items-center gap-6 text-sm md:flex">
          <Link href="/cuts" className="hover:text-wine-600 py-2">
            {t("cuts")}
          </Link>
          <Link href="/recipes" className="hover:text-wine-600 py-2">
            {t("recipes")}
          </Link>
          <Link href="/kashrut" className="hover:text-wine-600 py-2">
            {t("kashrut")}
          </Link>
        </nav>

        <Link
          href="/"
          className="font-display col-start-1 justify-self-start text-[22px] leading-none whitespace-nowrap md:col-start-2 md:justify-self-center md:text-[28px]"
          aria-label={`${brand.name[locale]} — ${t("home")}`}
        >
          {brand.name[locale]}
        </Link>

        <div className="col-start-3 flex items-center justify-self-end gap-0.5 sm:gap-1">
          <form action={`/${locale}/search`} role="search" className="hidden lg:block">
            <label htmlFor="site-search" className="sr-only">
              {t("search")}
            </label>
            <input
              id="site-search"
              name="q"
              type="search"
              placeholder={t("searchPlaceholder")}
              className="placeholder:text-char-500 border-bone-300 focus:border-char-900 min-h-10 w-52 border-b bg-transparent px-1 text-sm outline-none"
            />
          </form>
          <Link href="/search" className="hover:bg-bone-200 grid size-11 place-items-center rounded-full lg:hidden" aria-label={t("search")}>
            <SearchIcon />
          </Link>
          <Suspense fallback={localeFallback}>
            <LocaleSwitch label={t("switchLocale")} shortLabel={t("switchLocaleShort")} ariaLabel={t("switchLocaleLabel")} />
          </Suspense>
          <Link
            href="/account"
            className="hover:bg-bone-200 hidden size-11 place-items-center rounded-full md:grid"
            aria-label={t("account")}
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
              <circle cx="12" cy="8.5" r="3.5" />
              <path d="M5 20c1.3-3.5 4-5.2 7-5.2s5.7 1.7 7 5.2" />
            </svg>
          </Link>
          <div className="hidden md:block">
            <CartButton />
          </div>
        </div>
      </div>

      <nav aria-label={t("categories")} className="border-bone-300 border-y">
        <ul className="scrollbar-none mx-auto flex max-w-7xl gap-1 overflow-x-auto px-3 sm:px-6 md:justify-center md:gap-4">
          {categories.map((c) => (
            <li key={c.id} className="shrink-0">
              <Link
                href={`/c/${c.slug}`}
                className="text-char-700 hover:text-char-900 inline-flex min-h-11 items-center px-2 text-sm whitespace-nowrap"
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
