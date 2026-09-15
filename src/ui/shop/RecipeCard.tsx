import Image from "next/image";
import { getTranslations } from "next-intl/server";
import type { Recipe } from "@/content/recipes";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

export const recipePhoto = (recipe: Pick<Recipe, "heroProduct">) => `/catalog/products/${recipe.heroProduct}.jpg`;

export const totalMinutes = (r: Pick<Recipe, "prepMinutes" | "cookMinutes" | "restMinutes">) =>
  r.prepMinutes + r.cookMinutes + (r.restMinutes ?? 0);

/** "45 min", "5 h 30 min" — recipe times read at a glance. */
export async function formatDuration(minutes: number) {
  const t = await getTranslations("shop.recipes");
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return t("minutes", { m });
  if (m === 0) return t("hours", { h });
  return t("hoursMinutes", { h, m });
}

export async function RecipeCard({ recipe: r, locale, priority }: { recipe: Recipe; locale: Locale; priority?: boolean }) {
  const t = await getTranslations("shop");
  const he = locale === "he";
  const title = he ? r.titleHe : r.titleEn;
  return (
    <article className="group relative flex flex-col gap-3">
      <div className="bg-bone-200 relative aspect-[4/3] overflow-hidden rounded-[3px]">
        <Image
          src={recipePhoto(r)}
          alt=""
          fill
          priority={priority}
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 80vw"
          className="object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(.2,.7,.2,1)] group-hover:scale-[1.04]"
        />
      </div>
      <p className="text-brass-700 text-xs font-semibold tracking-[0.06em]">
        {t(`occasion.${r.occasion}`)} · {await formatDuration(totalMinutes(r))}
      </p>
      <h3 className="font-display text-2xl leading-tight">
        <Link href={`/recipes/${r.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-wine-600">
          {title}
        </Link>
      </h3>
      <p className="text-char-700 line-clamp-2 text-[15px] leading-relaxed">{he ? r.introHe : r.introEn}</p>
    </article>
  );
}
