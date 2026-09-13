import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <nav aria-label="breadcrumb" className="text-char-500 text-sm">
        <Link href="/" className="hover:text-char-900 underline-offset-4 hover:underline">
          {t("product.breadcrumbHome")}
        </Link>
      </nav>
      <header className="mt-2 mb-8 flex flex-col gap-2">
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">{he ? data.category.nameHe : data.category.nameEn}</h1>
        <p className="font-reading text-char-700 max-w-2xl text-lg">
          {he ? data.category.descriptionHe : data.category.descriptionEn}
        </p>
      </header>
      <CategoryBrowser items={items} />
    </div>
  );
}
