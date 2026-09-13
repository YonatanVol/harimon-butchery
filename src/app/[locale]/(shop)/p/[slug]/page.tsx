import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { agorot } from "@/domain/money/agorot";
import { formatAgorot } from "@/domain/money/format";
import { Link } from "@/i18n/navigation";
import { type Locale, routing } from "@/i18n/routing";
import { getCategory, getProduct, listProductSlugs } from "@/infra/db/queries/catalog";
import { Badge } from "@/ui/primitives/Badge";
import { AvailabilityChip, formatRestock } from "@/ui/shop/AvailabilityChip";
import { KashrutPanel } from "@/ui/shop/KashrutPanel";
import { ProductCard } from "@/ui/shop/ProductCard";
import { ProductImage } from "@/ui/shop/ProductImage";
import { PurchasePanel } from "@/ui/shop/PurchasePanel";

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
  return {
    title: he ? data.product.nameHe : data.product.nameEn,
    description: he ? data.product.shortDescHe : data.product.shortDescEn,
  };
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

  const more = ((await getCategory(data.categorySlug))?.products ?? []).filter((x) => x.id !== p.id).slice(0, 4);

  const outLabel =
    availability.kind === "OUT"
      ? availability.restockDate
        ? t("product.outOfStockRestock", { date: formatRestock(format, availability.restockDate) })
        : t("product.outOfStock")
      : "";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <nav aria-label="breadcrumb" className="text-char-500 flex flex-wrap gap-2 text-sm">
        <Link href="/" className="hover:text-char-900 underline-offset-4 hover:underline">
          {t("product.breadcrumbHome")}
        </Link>
        <span aria-hidden>/</span>
        <Link href={`/c/${data.categorySlug}`} className="hover:text-char-900 underline-offset-4 hover:underline">
          {he ? data.categoryNameHe : data.categoryNameEn}
        </Link>
      </nav>

      <div className="mt-4 grid gap-8 lg:grid-cols-2 lg:gap-12">
        <div className="flex flex-col gap-4">
          <ProductImage
            src={p.image}
            alt={name}
            animal={p.animal}
            label={name}
            sizes="(min-width: 1024px) 50vw, 100vw"
            priority
            className="aspect-[4/3] rounded-3xl"
          />
          <div className="hidden lg:block">
            <KashrutPanel kashrut={kashrut} authority={authority} locale={locale} />
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <header className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <AvailabilityChip availability={availability} />
              {kashrut.glatt === "GLATT_CHALAK" && <Badge tone="wine">{t("kashrut.GLATT_CHALAK")}</Badge>}
              {kashrut.passover === "KOSHER_LEPESACH" && <Badge>{t("kashrut.KOSHER_LEPESACH")}</Badge>}
              {p.agingDays ? <Badge>{t("card.aged", { days: p.agingDays })}</Badge> : null}
            </div>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">{name}</h1>
            {he && <p className="text-char-500 -mt-2 text-sm" lang="en">{p.nameEn}</p>}
            <bdi className="text-2xl font-semibold tabular-nums">
              {p.pricingMode === "WEIGHT"
                ? t("card.perKg", { price: formatAgorot(agorot(p.pricePerKgAgorot!), locale) })
                : t("card.perPackage", { price: formatAgorot(agorot(p.packagePriceAgorot!), locale) })}
            </bdi>
            <p className="font-reading text-char-700 text-lg">{he ? p.longDescHe : p.longDescEn}</p>
          </header>

          {p.pricingMode === "PACKAGE" && (
            <div className="bg-bone-100 rounded-2xl p-4">
              <h2 className="text-char-700 text-sm font-medium">{t("product.contents")}</h2>
              <p className="mt-1 font-medium">{he ? p.packageContentsHe : p.packageContentsEn}</p>
            </div>
          )}

          {p.handlingFlags.includes("REQUIRES_BROILING_TZLIYA") && (
            <div role="note" className="border-warn-600 bg-warn-600/10 rounded-xl border-s-4 p-4">
              <p className="text-warn-600 text-sm font-semibold">{t("product.handling")}</p>
              <p className="mt-1">{t("flags.REQUIRES_BROILING_TZLIYA")}</p>
            </div>
          )}

          <PurchasePanel
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

          <dl className="grid gap-4 border-t border-bone-300 pt-6 sm:grid-cols-2">
            {(he ? p.cutOriginHe : p.cutOriginEn) && (
              <div>
                <dt className="text-char-500 text-sm">{t("product.origin")}</dt>
                <dd className="mt-1 font-medium">{he ? p.cutOriginHe : p.cutOriginEn}</dd>
              </div>
            )}
            {p.agingDays ? (
              <div>
                <dt className="text-char-500 text-sm">{t("product.agingLabel")}</dt>
                <dd className="mt-1 font-medium">{t("product.aging", { days: p.agingDays })}</dd>
              </div>
            ) : null}
            <div className="sm:col-span-2">
              <dt className="text-char-500 text-sm">{t("product.cooking")}</dt>
              <dd className="font-reading mt-1">{he ? p.cookingHe : p.cookingEn}</dd>
            </div>
            {p.handlingFlags
              .filter((f) => f !== "REQUIRES_BROILING_TZLIYA")
              .map((f) => (
                <div key={f}>
                  <dt className="text-char-500 text-sm">{t("product.handling")}</dt>
                  <dd className="mt-1 font-medium">{t(`flags.${f}`)}</dd>
                </div>
              ))}
          </dl>

          <div className="lg:hidden">
            <KashrutPanel kashrut={kashrut} authority={authority} locale={locale} />
          </div>
        </div>
      </div>

      {more.length > 0 && (
        <section className="mt-16" aria-labelledby="more-title">
          <h2 id="more-title" className="text-2xl font-bold tracking-tight">
            {t("product.more", { category: he ? data.categoryNameHe : data.categoryNameEn })}
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {more.map((x) => (
              <ProductCard key={x.id} product={x} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
