import { useFormatter, useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { brand } from "@/config/brand";
import type { Locale } from "@/i18n/routing";

export default function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = use(params) as { locale: Locale };
  setRequestLocale(locale);

  const t = useTranslations("home");
  const format = useFormatter();

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-24">
      <p className="text-wine-600 text-sm font-medium">{t("comingSoon")}</p>
      <h1 className="text-5xl font-bold tracking-tight">{brand.name[locale]}</h1>
      <p className="font-reading text-char-700 text-xl">{brand.tagline[locale]}</p>
      <p className="border-bone-300 border-s-4 ps-4 text-2xl">
        {t("sampleCut")} ·{" "}
        {t("pricePerKg", {
          price: format.number(129.9, { style: "currency", currency: "ILS" }),
        })}
      </p>
    </main>
  );
}
