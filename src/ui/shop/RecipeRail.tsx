import { getTranslations } from "next-intl/server";
import { recipes } from "@/content/recipes";
import { OCCASIONS } from "@/domain/catalog/occasions";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { cx } from "../cx";
import { RecipeCard } from "./RecipeCard";

/** One recipe per occasion (up to four) on the home page, with a way into the full collection. */
export async function RecipeRail({ locale, className }: { locale: Locale; className?: string }) {
  const t = await getTranslations("shop.home");
  const picks = OCCASIONS.map((o) => recipes.find((r) => r.occasion === o))
    .filter((r): r is (typeof recipes)[number] => Boolean(r))
    .slice(0, 4);
  if (picks.length === 0) return null;

  return (
    <section className={cx("reveal mx-auto max-w-7xl sm:px-6", className)} aria-labelledby="recipes-rail-title">
      <div className="flex items-baseline justify-between px-4 sm:px-0">
        <h2 id="recipes-rail-title" className="font-display text-3xl sm:text-4xl">
          {t("recipesTitle")}
        </h2>
        <Link href="/recipes" className="text-wine-600 hover:text-char-900 text-sm">
          {t("recipesAll", { count: recipes.length })}
        </Link>
      </div>
      <div className="scrollbar-none mt-6 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-2 sm:grid sm:grid-cols-2 sm:gap-8 sm:overflow-visible sm:px-0 lg:grid-cols-4">
        {picks.map((r) => (
          <div key={r.slug} className="w-[80%] shrink-0 snap-start sm:w-auto">
            <RecipeCard recipe={r} locale={locale} />
          </div>
        ))}
      </div>
    </section>
  );
}
