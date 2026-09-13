import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { OCCASIONS, occasionFromSlug, occasionSlug } from "@/domain/catalog/occasions";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { listProducts } from "@/infra/db/queries/catalog";
import { ProductCard } from "@/ui/shop/ProductCard";

export const revalidate = 60;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => OCCASIONS.map((o) => ({ locale, occasion: occasionSlug(o) })));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/o/[occasion]">): Promise<Metadata> {
  const { locale, occasion: slug } = await params;
  const occasion = occasionFromSlug(slug);
  if (!occasion) return {};
  const t = await getTranslations({ locale, namespace: "shop.occasion" });
  return { title: t("title", { occasion: t(occasion) }) };
}

export default async function OccasionPage({ params }: PageProps<"/[locale]/o/[occasion]">) {
  const { locale, occasion: slug } = await params;
  setRequestLocale(locale);
  const occasion = occasionFromSlug(slug);
  if (!occasion) notFound();
  const t = await getTranslations("shop");
  const products = (await listProducts()).filter((p) => p.occasions?.includes(occasion));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <nav aria-label="breadcrumb" className="text-char-500 text-sm">
        <Link href="/" className="hover:text-char-900 underline-offset-4 hover:underline">
          {t("product.breadcrumbHome")}
        </Link>
      </nav>
      <header className="mt-2 mb-8 flex flex-col gap-2">
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
          {t("occasion.title", { occasion: t(`occasion.${occasion}`) })}
        </h1>
        <p className="font-reading text-char-700 text-lg">{t(`occasion.${occasion}_desc`)}</p>
      </header>
      <nav aria-label={t("home.occasionsTitle")} className="mb-8 flex flex-wrap gap-2">
        {OCCASIONS.map((o) => (
          <Link
            key={o}
            href={`/o/${occasionSlug(o)}`}
            aria-current={o === occasion ? "page" : undefined}
            className="aria-[current=page]:bg-char-900 aria-[current=page]:text-bone-50 bg-bone-50 ring-bone-300 hover:bg-bone-100 inline-flex min-h-10 items-center rounded-full px-4 text-sm font-medium ring-1 ring-inset first-letter:uppercase"
          >
            {t(`occasion.${o}`)}
          </Link>
        ))}
      </nav>
      <p className="text-char-700 mb-4 text-sm">{t("category.resultCount", { count: products.length })}</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((p, i) => (
          <ProductCard key={p.id} product={p} priority={i < 4} />
        ))}
      </div>
    </div>
  );
}
