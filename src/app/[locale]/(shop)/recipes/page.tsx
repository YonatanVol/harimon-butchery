import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { recipes } from "@/content/recipes";
import { OCCASIONS } from "@/domain/catalog/occasions";
import type { Locale } from "@/i18n/routing";
import { alternatesFor } from "@/i18n/alternates";
import { RecipeCard } from "@/ui/shop/RecipeCard";

export async function generateMetadata({ params }: PageProps<"/[locale]/recipes">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "shop.recipes" });
  return { title: t("title"), description: t("lead"), alternates: alternatesFor(locale, "/recipes") };
}

export default async function RecipesPage({ params }: PageProps<"/[locale]/recipes">) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = raw as Locale;
  const t = await getTranslations("shop");
  const groups = OCCASIONS.map((o) => ({ occasion: o, items: recipes.filter((r) => r.occasion === o) })).filter((g) => g.items.length > 0);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <header className="mx-auto flex max-w-3xl flex-col items-center gap-4 py-14 text-center sm:py-20">
        <span aria-hidden className="bg-brass-500 h-px w-12" />
        <h1 className="rise-1 font-display text-5xl font-light sm:text-6xl">{t("recipes.title")}</h1>
        <p className="rise-2 text-char-700 max-w-xl text-lg leading-relaxed">{t("recipes.lead")}</p>
        <nav aria-label={t("recipes.byOccasion")} className="rise-3 mt-2 flex flex-wrap justify-center gap-2">
          {groups.map((g) => (
            <a key={g.occasion} href={`#${g.occasion.toLowerCase()}`} className="border-bone-300 hover:border-char-900 inline-flex min-h-11 items-center border px-4 text-sm">
              <span className="first-letter:uppercase">{t(`occasion.${g.occasion}`)}</span>
              <span className="text-char-500 ms-2 tabular-nums">{g.items.length}</span>
            </a>
          ))}
        </nav>
      </header>

      {groups.map((g, gi) => (
        <section key={g.occasion} id={g.occasion.toLowerCase()} className="reveal scroll-mt-32 pb-16" aria-labelledby={`${g.occasion}-title`}>
          <div className="border-char-900 flex items-baseline justify-between border-t pt-5">
            <h2 id={`${g.occasion}-title`} className="font-display text-3xl first-letter:uppercase sm:text-4xl">
              {t(`recipes.group.${g.occasion}`)}
            </h2>
            <span className="text-char-500 text-sm">{t(`occasion.${g.occasion}_desc`)}</span>
          </div>
          <div className="mt-8 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {g.items.map((r, i) => (
              <RecipeCard key={r.slug} recipe={r} locale={locale} priority={gi === 0 && i < 3} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
