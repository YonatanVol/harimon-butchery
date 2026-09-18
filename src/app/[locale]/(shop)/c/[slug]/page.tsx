import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { alternatesFor } from "@/i18n/alternates";
import { routing } from "@/i18n/routing";
import { getCategory, listCategories } from "@/infra/db/queries/catalog";
import { CategoryBrowser } from "@/ui/shop/CategoryBrowser";
import { ProductCard } from "@/ui/shop/ProductCard";

export const revalidate = 60;

export async function generateStaticParams() {
  const categories = await listCategories();
  return routing.locales.flatMap((locale) => categories.map((c) => ({ locale, slug: c.slug })));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/c/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const data = await getCategory(slug);
  if (!data) return {};
  const he = locale === "he";
  return {
    title: he ? data.category.nameHe : data.category.nameEn,
    description: (he ? data.category.descriptionHe : data.category.descriptionEn) ?? undefined,
    alternates: alternatesFor(locale, `/c/${slug}`),
  };
}

export default async function CategoryPage({ params }: PageProps<"/[locale]/c/[slug]">) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const data = await getCategory(slug);
  if (!data) notFound();
  const t = await getTranslations("shop");
  const he = locale === "he";

  const items = data.products.map((p, i) => ({
    id: p.id,
    node: <ProductCard product={p} priority={i < 4} />,
    name: he ? p.nameHe! : p.nameEn!,
    sortOrder: p.sortOrder!,
    price: (p.pricingMode === "WEIGHT" ? p.pricePerKgAgorot : p.packagePriceAgorot) ?? 0,
    authority: p.authoritySlug!,
    authorityLabel: (he ? p.authorityBadgeHe : p.authorityBadgeEn)!,
    chalak: p.glatt === "GLATT_CHALAK",
    passover: p.passover === "KOSHER_LEPESACH",
    inStock: p.availability.kind !== "OUT",
  }));

  const name = he ? data.category.nameHe : data.category.nameEn;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-10 sm:px-6">
      <header className="bg-char-900 relative isolate -mx-4 mb-10 overflow-hidden sm:mx-0 sm:mt-6 sm:rounded-[4px]">
        {data.category.image && (
          <Image src={data.category.image} alt="" fill priority sizes="(min-width: 1280px) 1232px, 100vw" className="motion-safe:animate-settle -z-10 object-cover opacity-80" />
        )}
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-[#1b1916e6] via-[#1b191680] to-[#1b191633]" />
        <div className="text-bone-100 flex min-h-64 flex-col justify-end gap-3 px-6 pt-16 pb-8 sm:min-h-80 sm:px-10 sm:pb-10">
          <nav aria-label="breadcrumb" className="text-bone-300 text-sm">
            <Link href="/" className="hover:text-bone-50">
              {t("product.breadcrumbHome")}
            </Link>
          </nav>
          <h1 className="rise-1 font-display text-5xl font-light md:text-7xl">{name}</h1>
          <span aria-hidden className="bg-brass-500 h-px w-12" />
          <p className="rise-2 text-bone-200 max-w-2xl text-lg">{he ? data.category.descriptionHe : data.category.descriptionEn}</p>
        </div>
      </header>
      <CategoryBrowser items={items} />
    </div>
  );
}
