import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { OCCASIONS, occasionSlug } from "@/domain/catalog/occasions";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { listCategories, listProducts } from "@/infra/db/queries/catalog";
import { AnimalGlyph } from "@/ui/shop/AnimalGlyph";
import { DeliverySentence } from "@/ui/shop/DeliverySentence";
import { ProductCard } from "@/ui/shop/ProductCard";

export const revalidate = 60;

const occasionAnimal = { SHABBAT: "CHICKEN", GRILL: "BEEF", HOLIDAY: "LAMB", SLOW_COOK: "BEEF", WEEKNIGHT: "TURKEY" } as const;
const categoryAnimal: Record<string, "BEEF" | "CHICKEN" | "TURKEY" | "LAMB" | "MIXED"> = {
  beef: "BEEF",
  "dry-aged": "BEEF",
  chicken: "CHICKEN",
  turkey: "TURKEY",
  lamb: "LAMB",
  ground: "MIXED",
  grill: "MIXED",
  offal: "CHICKEN",
  packages: "MIXED",
};

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("shop");
  const [categories, products] = await Promise.all([listCategories(), listProducts()]);
  const bestSellers = products.filter((p) => p.isBestSeller).slice(0, 8);

  return (
    <>
      <section className="bg-char-900 text-bone-50 relative overflow-hidden">
        <div
          aria-hidden
          className="text-wine-500 absolute inset-0 opacity-[0.12] [background-image:radial-gradient(currentColor_2px,transparent_2px)] [background-size:28px_28px]"
        />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div className="flex flex-col gap-6">
            <p className="text-bone-300 text-sm font-medium tracking-wide">{t("home.eyebrow")}</p>
            <h1 className="text-5xl leading-[1.05] font-bold tracking-tight text-balance md:text-7xl">
              {t("home.headline")}
            </h1>
            <p className="font-reading text-bone-200 max-w-xl text-lg md:text-xl">{t("home.lead")}</p>
            <DeliverySentence />
            <div className="flex flex-wrap gap-3">
              <Link
                href="/c/beef"
                className="bg-wine-600 hover:bg-wine-500 inline-flex min-h-12 items-center rounded-lg px-6 text-base font-semibold"
              >
                {t("home.ctaShop")}
              </Link>
              <a
                href="#how-weight-works"
                className="ring-bone-50/30 hover:bg-bone-50/10 inline-flex min-h-12 items-center rounded-lg px-6 text-base font-medium ring-1 ring-inset"
              >
                {t("home.ctaHow")}
              </a>
            </div>
          </div>
          <ol
            id="how-weight-works"
            className="bg-bone-50/5 ring-bone-50/15 flex scroll-mt-32 flex-col gap-4 rounded-2xl p-6 ring-1 backdrop-blur-sm"
          >
            <li className="text-bone-50 text-lg font-semibold">{t("home.weighExplainTitle")}</li>
            {(["weighExplain1", "weighExplain2", "weighExplain3", "weighExplain4"] as const).map((key, i) => (
              <li key={key} className="flex gap-3">
                <span className="bg-wine-600 grid size-7 shrink-0 place-items-center rounded-full text-sm font-bold tabular-nums">
                  {i + 1}
                </span>
                <span className="font-reading text-bone-200">{t(`home.${key}`)}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6" aria-labelledby="occasions-title">
        <h2 id="occasions-title" className="text-3xl font-bold tracking-tight">
          {t("home.occasionsTitle")}
        </h2>
        <ul className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
          {OCCASIONS.map((o) => (
            <li key={o}>
              <Link
                href={`/o/${occasionSlug(o)}`}
                className="bg-bone-100 hover:bg-bone-200 ring-bone-300 group flex h-full flex-col gap-3 rounded-2xl p-5 ring-1 transition-colors"
              >
                <AnimalGlyph animal={occasionAnimal[o]} className="text-wine-600 size-10" />
                <span className="text-lg font-semibold first-letter:uppercase">{t(`occasion.${o}`)}</span>
                <span className="text-char-700 font-reading text-sm">{t(`occasion.${o}_desc`)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6" aria-labelledby="categories-title">
        <h2 id="categories-title" className="text-3xl font-bold tracking-tight">
          {t("home.categoriesTitle")}
        </h2>
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {categories.map((c) => (
            <li key={c.id}>
              <Link
                href={`/c/${c.slug}`}
                className="bg-char-900 text-bone-50 hover:bg-char-800 relative flex aspect-[5/4] flex-col justify-end gap-1 overflow-hidden rounded-2xl p-4"
              >
                <AnimalGlyph
                  animal={categoryAnimal[c.slug] ?? "MIXED"}
                  className="text-wine-500 absolute top-4 end-4 size-12 opacity-80"
                />
                <span className="text-xl font-bold">{locale === "he" ? c.nameHe : c.nameEn}</span>
                <span className="text-bone-300 text-sm">{t("home.productsCount", { count: c.productCount })}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6" aria-labelledby="best-title">
        <h2 id="best-title" className="text-3xl font-bold tracking-tight">
          {t("home.bestSellersTitle")}
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {bestSellers.map((p, i) => (
            <ProductCard key={p.id} product={p} priority={i < 4} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6" aria-labelledby="trust-title">
        <h2 id="trust-title" className="sr-only">
          {t("home.trustTitle")}
        </h2>
        <ul className="grid gap-4 md:grid-cols-3">
          {([1, 2, 3] as const).map((n) => (
            <li key={n} className="border-bone-300 flex flex-col gap-2 border-s-4 ps-5">
              <h3 className="text-lg font-semibold">{t(`home.trust${n}Title`)}</h3>
              <p className="text-char-700 font-reading">{t(`home.trust${n}Body`)}</p>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
