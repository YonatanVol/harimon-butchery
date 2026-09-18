import { getLocale, getTranslations } from "next-intl/server";
import { brand } from "@/config/brand";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { InstallApp } from "./InstallApp";

export async function SiteFooter() {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("shop.footer");
  const nav = await getTranslations("shop.nav");

  return (
    // The extra bottom padding on phones keeps the last line clear of the fixed tab bar.
    <footer className="bg-char-900 text-bone-200 mt-24 pb-24 md:pb-0">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1.2fr]">
        <div className="flex flex-col gap-3">
          <span className="font-display text-bone-50 text-3xl">{brand.name[locale]}</span>
          <span aria-hidden className="bg-brass-500 h-px w-12" />
          <p className="text-bone-300 max-w-sm text-sm leading-relaxed">{brand.tagline[locale]}</p>
          <p className="text-bone-300 text-sm">{t("hours")}</p>
        </div>
        <nav aria-label={t("shop")} className="flex flex-col gap-2.5 text-sm">
          <Link href="/cuts" className="hover:text-bone-50 w-fit underline-offset-4 hover:underline">
            {nav("cuts")}
          </Link>
          <Link href="/recipes" className="hover:text-bone-50 w-fit underline-offset-4 hover:underline">
            {nav("recipes")}
          </Link>
          <Link href="/kashrut" className="hover:text-bone-50 w-fit underline-offset-4 hover:underline">
            {t("kashrut")}
          </Link>
          <Link href="/account" className="hover:text-bone-50 w-fit underline-offset-4 hover:underline">
            {nav("account")}
          </Link>
          <InstallApp />
        </nav>
        <div role="note" className="border-bone-300/20 border-s ps-5">
          <p className="text-bone-50 text-sm font-semibold">{t("demoTitle")}</p>
          <p className="text-bone-300 mt-1 text-sm leading-relaxed">{t("demoBody")}</p>
        </div>
      </div>
      <div className="border-bone-300/10 text-bone-400 border-t py-5 text-center text-xs">{t("rights")}</div>
    </footer>
  );
}
