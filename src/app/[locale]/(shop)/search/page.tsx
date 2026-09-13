import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { listCategories, searchProducts } from "@/infra/db/queries/catalog";
import { ProductCard } from "@/ui/shop/ProductCard";

export async function generateMetadata({ params }: PageProps<"/[locale]/search">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "shop.search" });
  return { title: t("title"), robots: { index: false } };
}

export default async function SearchPage({ params, searchParams }: PageProps<"/[locale]/search">) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("shop");
  const q = String((await searchParams).q ?? "").trim().slice(0, 80);
  const [results, categories] = await Promise.all([q ? searchProducts(q) : Promise.resolve([]), listCategories()]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <form role="search" className="flex max-w-2xl gap-2">
        <label htmlFor="search-page-q" className="sr-only">
          {t("search.prompt")}
        </label>
        <input
          id="search-page-q"
          name="q"
          type="search"
          defaultValue={q}
          autoFocus={!q}
          placeholder={t("nav.searchPlaceholder")}
          className="bg-bone-50 focus:ring-wine-500 min-h-12 flex-1 rounded-lg border border-bone-300 px-4 text-base outline-none focus:ring-2"
        />
        <button type="submit" className="bg-char-900 text-bone-50 min-h-12 rounded-lg px-6 font-medium">
          {t("nav.searchSubmit")}
        </button>
      </form>

      {q ? (
        <>
          <h1 className="mt-8 text-3xl font-bold tracking-tight">
            {results.length ? t("search.resultsFor", { query: q }) : t("search.empty", { query: q })}
          </h1>
          {results.length > 0 ? (
            <>
              <p className="text-char-700 mt-2 text-sm">{t("category.resultCount", { count: results.length })}</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {results.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </>
          ) : (
            <p className="font-reading text-char-700 mt-2 text-lg">{t("search.emptyHint")}</p>
          )}
        </>
      ) : (
        <h1 className="mt-8 text-3xl font-bold tracking-tight">{t("search.prompt")}</h1>
      )}

      {results.length === 0 && (
        <section className="mt-10">
          <h2 className="text-char-700 text-sm font-medium">{t("search.browse")}</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {categories.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/c/${c.slug}`}
                  className="bg-bone-50 ring-bone-300 hover:bg-bone-100 inline-flex min-h-10 items-center rounded-full px-4 text-sm font-medium ring-1 ring-inset"
                >
                  {locale === "he" ? c.nameHe : c.nameEn}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
