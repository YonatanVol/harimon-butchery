import { getLocale, getTranslations } from "next-intl/server";
import { brand } from "@/config/brand";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

export async function SiteFooter() {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("shop.footer");

  return (
    <footer className="bg-char-900 text-bone-200 mt-24">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div className="flex flex-col gap-2">
          <span className="text-bone-50 text-xl font-bold">{brand.name[locale]}</span>
          <p className="font-reading text-bone-300 text-sm">{brand.tagline[locale]}</p>
          <p className="text-bone-300 text-sm">{t("hours")}</p>
        </div>
        <nav aria-label={t("shop")} className="flex flex-col gap-2 text-sm">
          <Link href="/kashrut" className="hover:text-bone-50 underline-offset-4 hover:underline">
            {t("kashrut")}
          </Link>
        </nav>
        <div role="note" className="border-bone-300/20 rounded-xl border p-4">
          <p className="text-bone-50 text-sm font-semibold">{t("demoTitle")}</p>
          <p className="font-reading text-bone-300 mt-1 text-sm">{t("demoBody")}</p>
        </div>
      </div>
      <div className="border-bone-300/10 text-bone-300 border-t py-4 text-center text-xs">{t("rights")}</div>
    </footer>
  );
}
