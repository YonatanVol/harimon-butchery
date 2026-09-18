import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { ViewTransition } from "react";
import { brand } from "@/config/brand";
import { factsFor } from "@/content/productFacts";
import { recipesForProduct } from "@/content/recipes";
import { placementOf, REGIONS } from "@/domain/catalog/cutRegions";
import { pricePerServing } from "@/domain/catalog/perServing";
import { formatTenths } from "@/domain/catalog/reviews";
import { agorot } from "@/domain/money/agorot";
import { formatAgorot } from "@/domain/money/format";
import { toDecimalShekels } from "@/domain/money/wire";
import { formatGrams, grams } from "@/domain/weight/grams";
import { Link } from "@/i18n/navigation";
import { alternatesFor } from "@/i18n/alternates";
import { type Locale, routing } from "@/i18n/routing";
import { db } from "@/infra/db/client";
import { getCategory, getProduct, listProductSlugs } from "@/infra/db/queries/catalog";
import { appUrl } from "@/infra/payments/factory";
import { reviewsFor, summaryFor } from "@/infra/reviews/repository";
import { AskButcher } from "@/ui/shop/AskButcher";
import { AvailabilityChip, formatRestock } from "@/ui/shop/AvailabilityChip";
import { CutMap } from "@/ui/shop/CutMap";
import { KashrutPanel } from "@/ui/shop/KashrutPanel";
import { ProductCard } from "@/ui/shop/ProductCard";
import { ProductGallery } from "@/ui/shop/ProductGallery";
import { ProductImage } from "@/ui/shop/ProductImage";
import { ProductPurchase } from "@/ui/shop/ProductPurchase";
import { RecipeCard } from "@/ui/shop/RecipeCard";
import { ShareButton } from "@/ui/shop/ShareButton";
import { ratingJsonLd, ReviewList } from "@/ui/shop/reviews/ReviewList";
import { RatingLine } from "@/ui/shop/reviews/Stars";

export const revalidate = 60;

export async function generateStaticParams() {
  const slugs = await listProductSlugs();
  return routing.locales.flatMap((locale) => slugs.map(({ slug }) => ({ locale, slug })));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/p/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const data = await getProduct(slug);
  if (!data) return {};
  const he = locale === "he";
  const title = he ? data.product.nameHe : data.product.nameEn;
  const description = he ? data.product.shortDescHe : data.product.shortDescEn;
  return {
    title,
    description,
    openGraph: { title, description, images: data.product.image ? [{ url: data.product.image }] : undefined },
    alternates: alternatesFor(locale, `/p/${slug}`),
  };
}

const DONENESS = [
  { key: "RARE", tempC: 50, swatch: "#8f2d2a" },
  { key: "MEDIUM_RARE", tempC: 54, swatch: "#b24a3d" },
  { key: "MEDIUM", tempC: 60, swatch: "#c7796a" },
  { key: "MEDIUM_WELL", tempC: 65, swatch: "#b08878" },
  { key: "WELL_DONE", tempC: 70, swatch: "#8b6b5c" },
] as const;

function Meter({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-char-500 w-14 text-sm">{label}</span>
      <span className="flex gap-1" role="img" aria-label={`${label}: ${value}/5`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className={n <= value ? "bg-char-900 h-1.5 w-5" : "bg-bone-300 h-1.5 w-5"} />
        ))}
      </span>
    </div>
  );
}

export default async function ProductPage({ params }: PageProps<"/[locale]/p/[slug]">) {
  const { locale: raw, slug } = await params;
  setRequestLocale(raw);
  const locale = raw as Locale;
  const data = await getProduct(slug);
  if (!data) notFound();
  const t = await getTranslations("shop");
  const format = await getFormatter();
  const he = locale === "he";
  const { product: p, kashrut, authority, variants, availability } = data;
  const name = he ? p.nameHe : p.nameEn;
  const facts = factsFor(p.slug);
  const placement = placementOf(p.slug);
  const recipes = recipesForProduct(p.slug).slice(0, 3);
  const categoryName = he ? data.categoryNameHe : data.categoryNameEn;
  const origin = he ? p.cutOriginHe : p.cutOriginEn;

  const more = ((await getCategory(data.categorySlug))?.products ?? []).filter((x) => x.id !== p.id).slice(0, 4);
  const [summary, reviews] = await Promise.all([summaryFor(db, p.id), reviewsFor(db, p.id)]);

  // What search engines and WhatsApp previews read. Only facts that are also on the page.
  const priceAgorot = p.pricingMode === "WEIGHT" ? p.pricePerKgAgorot! : p.packagePriceAgorot!;
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    sku: p.slug,
    description: he ? p.shortDescHe : p.shortDescEn,
    image: p.image ? [new URL(p.image, appUrl()).toString()] : undefined,
    category: categoryName,
    brand: { "@type": "Brand", name: he ? brand.name.he : brand.name.en },
    offers: {
      "@type": "Offer",
      priceCurrency: "ILS",
      price: toDecimalShekels(agorot(priceAgorot)),
      availability: availability.kind === "OUT" ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
      url: new URL(`/${locale}/p/${p.slug}`, appUrl()).toString(),
      ...(p.pricingMode === "WEIGHT"
        ? { priceSpecification: { "@type": "UnitPriceSpecification", priceCurrency: "ILS", price: toDecimalShekels(agorot(priceAgorot)), referenceQuantity: { "@type": "QuantitativeValue", value: 1, unitCode: "KGM" } } }
        : {}),
    },
    aggregateRating: ratingJsonLd(summary),
    review: reviews.slice(0, 5).map((r) => ({
      "@type": "Review",
      author: { "@type": "Person", name: r.displayName },
      datePublished: r.createdAt.toISOString().slice(0, 10),
      reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5, worstRating: 1 },
      reviewBody: r.body,
    })),
  };

  const outLabel =
    availability.kind === "OUT"
      ? availability.restockDate
        ? t("product.outOfStockRestock", { date: formatRestock(format, availability.restockDate) })
        : t("product.outOfStock")
      : "";

  const regionLabels = placement
    ? Object.fromEntries((REGIONS[placement.animal] as readonly string[]).map((r) => [r, t(`cuts.region.${placement.animal}.${r}`)]))
    : {};
  const mapTitle = placement ? t("product.mapTitle", { name, animal: t(`cuts.animal.${placement.animal}`) }) : "";

  const stats: { value: string; label: string }[] = [];
  if (p.agingDays) stats.push({ value: String(p.agingDays), label: t("product.facts.agingDays") });
  if (facts?.thicknessCm?.length) stats.push({ value: t("product.facts.cm", { cm: facts.thicknessCm.join("–") }), label: t("product.facts.thickness") });
  if (facts?.servingG && p.pricingMode === "WEIGHT") stats.push({ value: formatGrams(grams(facts.servingG), locale), label: t("product.facts.perPerson") });
  if (facts?.donenessC) stats.push({ value: `${facts.donenessC}°`, label: t("product.facts.coreTemp") });
  if (facts && stats.length < 4) stats.push({ value: he ? facts.cookTimeHe : facts.cookTimeEn, label: t("product.facts.cookTime") });

  const photo = (
    <ViewTransition name={`product-photo-${p.slug}`}>
      <ProductImage src={p.image} alt={name} animal={p.animal} label={name} sizes="(min-width: 1024px) 55vw, 100vw" priority className="aspect-[4/5] sm:rounded-[3px] lg:aspect-[5/6]" />
    </ViewTransition>
  );

  return (
    <div className="mx-auto max-w-7xl sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd).replace(/</g, "\\u003c") }} />

      <nav aria-label="breadcrumb" className="text-char-500 flex flex-wrap gap-2 px-4 py-4 text-sm sm:px-0">
        <Link href="/" className="hover:text-char-900">
          {t("product.breadcrumbHome")}
        </Link>
        <span aria-hidden>/</span>
        <Link href={`/c/${data.categorySlug}`} className="hover:text-char-900">
          {categoryName}
        </Link>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <ProductGallery labels={[t("product.gallery.photo", { name }), ...(placement ? [t("product.gallery.map")] : [])]}>
            {photo}
            {placement && (
              <div className="bg-bone-50 flex aspect-[4/5] items-center px-4 sm:rounded-[3px] lg:aspect-[5/6]">
                <CutMap animal={placement.animal} active={placement.regions} labels={regionLabels} title={mapTitle} />
              </div>
            )}
          </ProductGallery>
        </div>

        <div className="flex flex-col gap-7 px-4 sm:px-0">
          <header className="flex flex-col gap-3">
            <p className="text-brass-700 text-xs font-semibold tracking-[0.08em]">
              {[categoryName, p.agingDays ? t("card.aged", { days: p.agingDays }) : null, kashrut.glatt === "GLATT_CHALAK" ? t("kashrut.GLATT_CHALAK") : null]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <h1 className="rise-1 font-display text-[44px] leading-[1.02] font-light md:text-6xl">{name}</h1>
            {he && (
              <p className="text-char-500 -mt-1 text-sm" lang="en">
                {p.nameEn}
              </p>
            )}
            <p className="rise-2 text-char-700 text-lg leading-relaxed">{he ? p.longDescHe : p.longDescEn}</p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <bdi className="text-xl font-semibold tabular-nums">
                {p.pricingMode === "WEIGHT"
                  ? t("card.perKg", { price: formatAgorot(agorot(p.pricePerKgAgorot!), locale) })
                  : t("card.perPackage", { price: formatAgorot(agorot(p.packagePriceAgorot!), locale) })}
              </bdi>
              {availability.kind !== "IN_STOCK" && <AvailabilityChip availability={availability} />}
            </div>
            {p.pricingMode === "WEIGHT" && facts?.servingG ? (
              <p className="text-char-500 text-sm">
                {t("product.perServing", {
                  price: formatAgorot(pricePerServing(agorot(p.pricePerKgAgorot!), facts.servingG), locale),
                  weight: formatGrams(grams(facts.servingG), locale),
                })}
              </p>
            ) : null}
            {summary.count > 0 && (
              <a href="#reviews-title" className="hover:text-char-900 w-fit">
                <RatingLine
                  averageTenths={summary.averageTenths}
                  count={summary.count}
                  label={t("reviews.ariaAverage", { average: formatTenths(summary.averageTenths) })}
                />
              </a>
            )}
          </header>

          {stats.length > 0 && (
            <dl className="border-bone-300 grid grid-cols-2 border-y sm:grid-cols-4">
              {stats.slice(0, 4).map((s, i) => (
                <div key={s.label} className={`flex flex-col gap-0.5 py-4 ${i % 2 === 1 ? "ps-4 sm:ps-0" : ""} sm:border-bone-300 sm:px-3 sm:first:ps-0 sm:not-first:border-s`}>
                  <dt className="text-char-500 order-2 text-xs">{s.label}</dt>
                  <dd className="order-1 text-lg font-semibold tabular-nums">{s.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {p.pricingMode === "PACKAGE" && (
            <div className="border-bone-300 border-s-2 ps-4">
              <h2 className="text-char-500 text-sm">{t("product.contents")}</h2>
              <p className="mt-1 font-medium">{he ? p.packageContentsHe : p.packageContentsEn}</p>
            </div>
          )}

          {p.handlingFlags.includes("REQUIRES_BROILING_TZLIYA") && (
            <div role="note" className="border-warn-600 bg-warn-600/10 border-s-4 p-4">
              <p className="text-warn-600 text-sm font-semibold">{t("product.handling")}</p>
              <p className="mt-1">{t("flags.REQUIRES_BROILING_TZLIYA")}</p>
            </div>
          )}

          <ProductPurchase
            outOfStockLabel={outLabel}
            product={{
              id: p.id,
              nameHe: p.nameHe,
              nameEn: p.nameEn,
              pricingMode: p.pricingMode,
              pricePerKgAgorot: p.pricePerKgAgorot,
              minOrderG: p.minOrderG,
              maxOrderG: p.maxOrderG,
              stepG: p.stepG,
              defaultOrderG: p.defaultOrderG,
              toleranceBp: p.toleranceBp,
              avgPieceG: p.avgPieceG,
              servingG: facts?.servingG ?? null,
              packagePriceAgorot: p.packagePriceAgorot,
              variants: variants.map((v) => ({
                id: v.id,
                nameHe: v.nameHe,
                nameEn: v.nameEn,
                priceDeltaAgorot: v.priceDeltaAgorot,
                isDefault: v.isDefault,
              })),
              availability,
            }}
          />

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <AskButcher productName={name} productUrl={`${appUrl()}/${locale}/p/${p.slug}`} />
            <ShareButton title={name} text={he ? p.shortDescHe : p.shortDescEn} />
            <Link href={`/compare?cuts=${p.slug}`} className="text-char-700 hover:text-char-900 inline-flex min-h-11 items-center gap-2 text-sm font-semibold">
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                <path d="M4 6h6M4 12h6M4 18h6M14 6h6M14 12h6M14 18h6" />
              </svg>
              {t("compare.cta")}
            </Link>
          </div>

          {facts && (
            <aside className="bg-bone-50 border-bone-300 flex flex-col gap-2 border p-5">
              <span aria-hidden className="bg-brass-500 h-px w-8" />
              <h2 className="font-display text-xl">{t("product.tipTitle")}</h2>
              <p className="text-char-700 leading-relaxed">{he ? facts.tipHe : facts.tipEn}</p>
            </aside>
          )}

          {p.handlingFlags.filter((f) => f !== "REQUIRES_BROILING_TZLIYA").length > 0 && (
            <ul className="text-char-700 flex flex-col gap-1 text-sm">
              {p.handlingFlags
                .filter((f) => f !== "REQUIRES_BROILING_TZLIYA")
                .map((f) => (
                  <li key={f}>· {t(`flags.${f}`)}</li>
                ))}
            </ul>
          )}
        </div>
      </div>

      {/* Where it comes from, and how to cook it. */}
      <section className="reveal mt-20 grid gap-10 px-4 sm:px-0 lg:grid-cols-2 lg:gap-14" aria-labelledby="cook-title">
        {placement ? (
          <div className="hidden flex-col gap-4 lg:flex">
            <h2 className="font-display text-3xl">{t("product.whereTitle")}</h2>
            {origin && <p className="text-char-700">{origin}</p>}
            <div className="bg-bone-50 border-bone-300 border p-6">
              <CutMap animal={placement.animal} active={placement.regions} labels={regionLabels} title={mapTitle} />
            </div>
            <Link href={`/cuts#${placement.animal.toLowerCase()}-${placement.regions[0]}`} className="text-wine-600 hover:text-char-900 w-fit text-sm">
              {t("product.toGuide")}
            </Link>
          </div>
        ) : (
          origin && (
            <div className="hidden flex-col gap-3 lg:flex">
              <h2 className="font-display text-3xl">{t("product.whereTitle")}</h2>
              <p className="text-char-700 text-lg">{origin}</p>
            </div>
          )
        )}

        <div className="flex flex-col gap-6">
          <h2 id="cook-title" className="font-display text-3xl">
            {t("product.cooking")}
          </h2>
          <p className="text-char-700 text-lg leading-relaxed">{he ? p.cookingHe : p.cookingEn}</p>
          {facts && (
            <>
              <div className="flex flex-wrap gap-2">
                {facts.methods.map((m) => (
                  <span key={m} className="border-bone-300 inline-flex min-h-9 items-center border px-3 text-sm">
                    {t(`product.method.${m}`)}
                  </span>
                ))}
              </div>
              <div className="flex flex-col gap-2">
                <Meter value={facts.fat} label={t("product.facts.fat")} />
                <Meter value={facts.tenderness} label={t("product.facts.tenderness")} />
              </div>
            </>
          )}
          {facts?.donenessC && (p.animal === "BEEF" || p.animal === "LAMB" || p.animal === "VEAL") && (
            <div className="flex flex-col gap-3">
              <h3 className="text-char-500 text-sm">{t("product.donenessTitle")}</h3>
              <ol className="border-bone-300 grid grid-cols-5 border">
                {DONENESS.map((d) => {
                  const on = Math.abs(d.tempC - facts.donenessC!) <= 2;
                  return (
                    <li key={d.key} className={`flex flex-col items-center gap-1.5 px-1 py-3 text-center ${on ? "bg-bone-50" : ""}`} aria-current={on || undefined}>
                      <span className="size-5 rounded-full" style={{ background: d.swatch }} aria-hidden />
                      <span className={`text-[11px] leading-tight sm:text-xs ${on ? "font-semibold" : ""}`}>{t(`product.doneness.${d.key}`)}</span>
                      <span className="text-char-500 text-[11px] tabular-nums" dir="ltr">
                        {d.tempC}°C
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
          <KashrutPanel kashrut={kashrut} authority={authority} locale={locale} />
        </div>
      </section>

      {recipes.length > 0 && (
        <section className="reveal mt-20 px-4 sm:px-0" aria-labelledby="recipes-title">
          <h2 id="recipes-title" className="font-display text-3xl">
            {t("product.recipesTitle", { name })}
          </h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {recipes.map((r) => (
              <RecipeCard key={r.slug} recipe={r} locale={locale} />
            ))}
          </div>
        </section>
      )}

      <section className="reveal mt-20 px-4 sm:px-0" aria-labelledby="reviews-title">
        <h2 id="reviews-title" className="font-display mb-6 scroll-mt-28 text-3xl">
          {t("reviews.title")}
        </h2>
        <ReviewList summary={summary} reviews={reviews} />
      </section>

      {more.length > 0 && (
        <section className="reveal mt-20" aria-labelledby="more-title">
          <h2 id="more-title" className="font-display px-4 text-3xl sm:px-0">
            {t("product.more", { category: categoryName })}
          </h2>
          <div className="scrollbar-none mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:grid sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:px-0 lg:grid-cols-4">
            {more.map((x) => (
              <div key={x.id} className="w-[64%] shrink-0 snap-start sm:w-auto">
                <ProductCard product={x} sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 64vw" />
              </div>
            ))}
          </div>
        </section>
      )}
      <div aria-hidden className="h-6 lg:hidden" />
    </div>
  );
}
