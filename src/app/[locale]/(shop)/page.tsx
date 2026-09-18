import type { Metadata } from "next";
import Image from "next/image";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { OCCASIONS, occasionSlug } from "@/domain/catalog/occasions";
import { REGIONS, slugsInRegion } from "@/domain/catalog/cutRegions";
import { alternatesFor } from "@/i18n/alternates";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { listCategories, listProducts } from "@/infra/db/queries/catalog";
import { CutMap } from "@/ui/shop/CutMap";
import { DeliverySentence } from "@/ui/shop/DeliverySentence";
import { ProductCard } from "@/ui/shop/ProductCard";
import { RecipeRail } from "@/ui/shop/RecipeRail";

export const revalidate = 60;

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  return { alternates: alternatesFor(locale, "") };
}

const HERO_PHOTO = "/catalog/products/entrecote.jpg";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("shop");
  const [categories, products] = await Promise.all([listCategories(), listProducts()]);
  const bestSellers = products.filter((p) => p.isBestSeller).slice(0, 8);
  const he = locale === "he";

  const beefLabels = Object.fromEntries(REGIONS.BEEF.map((r) => [r, t(`cuts.region.BEEF.${r}`)]));

  return (
    <>
      {/* Hero: one photograph of the cut, the promise, one way in. */}
      <section className="mx-auto max-w-7xl px-3 pt-3 sm:px-6 sm:pt-6">
        <div className="bg-char-900 relative isolate h-[min(78svh,640px)] min-h-[460px] overflow-hidden rounded-[4px]">
          <Image
            src={HERO_PHOTO}
            alt={t("home.heroPhotoAlt")}
            fill
            priority
            sizes="(min-width: 1280px) 1232px, 100vw"
            className="motion-safe:animate-settle -z-10 object-cover"
          />
          <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-[#1b1916e6] via-[#1b191666] via-45% to-transparent" />
          <div className="text-bone-100 absolute inset-x-0 bottom-0 flex flex-col gap-4 p-6 sm:p-10 md:max-w-2xl md:p-14">
            <p className="rise-1 text-brass-300 text-xs font-semibold tracking-[0.08em]">{t("home.eyebrow")}</p>
            <h1 className="rise-2 font-display text-[42px] leading-[1.02] font-light sm:text-6xl md:text-7xl">{t("home.headline")}</h1>
            <span aria-hidden className="bg-brass-500 h-px w-14 ltr:origin-left rtl:origin-right motion-safe:animate-draw-rule [animation-delay:.7s]" />
            <p className="rise-3 text-bone-200 max-w-xl text-base leading-relaxed sm:text-lg">{t("home.lead")}</p>
            <div className="rise-3 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link
                href="/c/beef"
                className="bg-bone-100 text-char-900 hover:bg-bone-50 inline-flex min-h-12 items-center rounded-[2px] px-6 text-[15px] font-semibold"
              >
                {t("home.ctaShop")}
              </Link>
              <a href="#how-weight-works" className="border-bone-100/60 hover:border-bone-100 border-b pb-0.5 text-[15px]">
                {t("home.ctaHow")}
              </a>
            </div>
          </div>
        </div>
        <div className="border-bone-300 flex justify-center border-b px-2 py-4">
          <DeliverySentence tone="light" />
        </div>
      </section>

      {/* From the counter: this week's favourites. */}
      <section className="reveal mx-auto max-w-7xl pt-14 sm:px-6" aria-labelledby="best-title">
        <div className="flex items-baseline justify-between px-4 sm:px-0">
          <h2 id="best-title" className="font-display text-3xl sm:text-4xl">
            {t("home.bestSellersTitle")}
          </h2>
          <Link href="/c/beef" className="text-wine-600 hover:text-char-900 text-sm">
            {t("home.seeAll")}
          </Link>
        </div>
        <div className="scrollbar-none mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:grid sm:grid-cols-2 sm:gap-x-6 sm:gap-y-10 sm:overflow-visible sm:px-0 lg:grid-cols-4">
          {bestSellers.map((p, i) => (
            <div key={p.id} className="w-[72%] shrink-0 snap-start sm:w-auto">
              <ProductCard product={p} priority={i < 2} sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 72vw" />
            </div>
          ))}
        </div>
      </section>

      {/* The craft: how honest weight pricing works. */}
      <section id="how-weight-works" className="reveal mx-auto max-w-5xl scroll-mt-32 px-4 pt-24 text-center sm:px-6" aria-labelledby="craft-title">
        <span aria-hidden className="bg-brass-500 mx-auto block h-px w-12" />
        <h2 id="craft-title" className="font-display mx-auto mt-6 max-w-2xl text-4xl leading-tight font-light sm:text-5xl">
          {t("home.craftTitle")}
        </h2>
        <p className="text-char-700 mx-auto mt-4 max-w-xl text-lg leading-relaxed">{t("home.craftBody")}</p>
        <ol className="border-bone-300 mt-12 grid gap-px border-y text-start sm:grid-cols-2 lg:grid-cols-4">
          {(["weighExplain1", "weighExplain2", "weighExplain3", "weighExplain4"] as const).map((key, i) => (
            <li key={key} className="flex gap-4 py-6 sm:px-5">
              <span className="font-display text-brass-700 text-3xl leading-none tabular-nums">{i + 1}</span>
              <span className="text-char-700 text-[15px] leading-relaxed">{t(`home.${key}`)}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* The counter by category, photographed. */}
      <section className="reveal mx-auto max-w-7xl px-4 pt-24 sm:px-6" aria-labelledby="categories-title">
        <h2 id="categories-title" className="font-display text-3xl sm:text-4xl">
          {t("home.categoriesTitle")}
        </h2>
        <ul className="mt-6 grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-3">
          {categories.map((c) => (
            <li key={c.id}>
              <Link href={`/c/${c.slug}`} className="group bg-char-900 relative isolate block aspect-square overflow-hidden rounded-[3px] sm:aspect-[4/3]">
                {c.image && (
                  <Image
                    src={c.image}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 33vw, 50vw"
                    className="-z-10 object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(.2,.7,.2,1)] group-hover:scale-[1.04]"
                  />
                )}
                <span aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-[#1b1916cc] via-transparent to-transparent" />
                <span className="text-bone-50 absolute bottom-3 start-3 flex flex-col sm:bottom-5 sm:start-5">
                  <span className="font-display text-xl leading-tight sm:text-3xl">{he ? c.nameHe : c.nameEn}</span>
                  <span className="text-bone-200 text-xs sm:text-sm">{t("home.productsCount", { count: c.productCount })}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Cut guide teaser. */}
      <section className="reveal mx-auto max-w-7xl px-4 pt-24 sm:px-6" aria-labelledby="guide-title">
        <div className="bg-bone-50 border-bone-300 grid items-center gap-8 border p-6 sm:p-10 lg:grid-cols-[1fr_1.3fr]">
          <div className="flex flex-col gap-4">
            <p className="text-brass-700 text-xs font-semibold tracking-[0.08em]">{t("home.guideEyebrow")}</p>
            <h2 id="guide-title" className="font-display text-4xl leading-tight font-light">
              {t("home.guideTitle")}
            </h2>
            <p className="text-char-700 max-w-md leading-relaxed">{t("home.guideBody")}</p>
            <Link href="/cuts" className="border-char-900 hover:bg-char-900 hover:text-bone-50 mt-2 inline-flex min-h-12 w-fit items-center border px-6 text-[15px] font-semibold transition-colors">
              {t("home.guideCta")}
            </Link>
          </div>
          <CutMap animal="BEEF" active={["rib"]} available={REGIONS.BEEF.filter((r) => slugsInRegion("BEEF", r).length > 0)} labels={beefLabels} title={t("cuts.mapTitle", { animal: t("cuts.animal.BEEF") })} hrefFor={(r) => (slugsInRegion("BEEF", r).length ? `/${locale}/cuts#beef-${r}` : null)} />
        </div>
      </section>

      <RecipeRail locale={locale} className="pt-24" />

      {/* What are you cooking? */}
      <section className="reveal mx-auto max-w-7xl px-4 pt-24 sm:px-6" aria-labelledby="occasions-title">
        <h2 id="occasions-title" className="font-display text-3xl sm:text-4xl">
          {t("home.occasionsTitle")}
        </h2>
        <ul className="border-bone-300 mt-6 grid border-t sm:grid-cols-2 lg:grid-cols-5">
          {OCCASIONS.map((o) => (
            <li key={o} className="border-bone-300 border-b lg:border-e lg:last:border-e-0">
              <Link href={`/o/${occasionSlug(o)}`} className="group flex min-h-24 flex-col justify-center gap-1 py-5 lg:px-5">
                <span className="font-display flex items-center justify-between text-2xl">
                  <span className="first-letter:uppercase">{t(`occasion.${o}`)}</span>
                  <span aria-hidden className="text-brass-700 transition-transform ltr:group-hover:translate-x-1 rtl:group-hover:-translate-x-1">
                    {he ? "←" : "→"}
                  </span>
                </span>
                <span className="text-char-500 text-sm">{t(`occasion.${o}_desc`)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="reveal mx-auto max-w-7xl px-4 pt-24 sm:px-6" aria-labelledby="trust-title">
        <h2 id="trust-title" className="sr-only">
          {t("home.trustTitle")}
        </h2>
        <ul className="grid gap-10 md:grid-cols-3">
          {([1, 2, 3] as const).map((n) => (
            <li key={n} className="flex flex-col gap-3">
              <span aria-hidden className="bg-brass-500 h-px w-10" />
              <h3 className="font-display text-2xl">{t(`home.trust${n}Title`)}</h3>
              <p className="text-char-700 leading-relaxed">{t(`home.trust${n}Body`)}</p>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
