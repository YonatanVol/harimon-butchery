import type { Metadata } from "next";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { listAuthorities, listProducts } from "@/infra/db/queries/catalog";
import { cx } from "@/ui/cx";
import { certificateState } from "@/ui/shop/KashrutPanel";

export const revalidate = 3600;

export async function generateMetadata({ params }: PageProps<"/[locale]/kashrut">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "shop.kashrut" });
  return { title: t("pageTitle") };
}

export default async function KashrutPage({ params }: PageProps<"/[locale]/kashrut">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("shop.kashrut");
  const format = await getFormatter();
  const [authorities, products] = await Promise.all([listAuthorities(), listProducts()]);
  const he = locale === "he";

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-4xl font-bold tracking-tight md:text-5xl">{t("pageTitle")}</h1>
      <p className="font-reading text-char-700 mt-3 text-lg">{t("pageLead")}</p>
      <p role="note" className="border-warn-600 bg-warn-600/10 mt-6 rounded-xl border-s-4 p-4 text-sm">
        {t("pageDemo")}
      </p>

      <ul className="mt-8 flex flex-col gap-4">
        {authorities.map((a) => {
          const state = certificateState(a.certificateValidUntil);
          const date = format.dateTime(new Date(`${a.certificateValidUntil}T12:00:00Z`), { dateStyle: "long" });
          const count = products.filter((p) => p.authoritySlug === a.slug).length;
          return (
            <li key={a.id} className="bg-bone-50 ring-bone-300 flex flex-col gap-3 rounded-2xl p-6 ring-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-2xl font-bold">{he ? a.nameHe : a.nameEn}</h2>
                <bdi className="text-char-500 text-sm tabular-nums">{a.certificateNumber}</bdi>
              </div>
              <p
                className={cx(
                  "font-medium",
                  state === "expired" ? "text-bad-600" : state === "expiresSoon" ? "text-warn-600" : "text-ok-600",
                )}
              >
                {state === "expired"
                  ? t("expired", { date })
                  : state === "expiresSoon"
                    ? t("expiresSoon", { date })
                    : t("validUntil", { date })}
              </p>
              <p className="text-char-700 text-sm">{t("productsUnder", { count })}</p>
              <p className="text-char-500 text-xs">{t("fictional")}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
