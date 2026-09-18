import { getLocale, getTranslations } from "next-intl/server";
import { ViewTransition } from "react";
import { agorot } from "@/domain/money/agorot";
import { formatAgorot } from "@/domain/money/format";
import { formatGrams, grams } from "@/domain/weight/grams";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { ProductCard as ProductCardData } from "@/infra/db/queries/catalog";
import { formatTenths } from "@/domain/catalog/reviews";
import { cx } from "../cx";
import { AvailabilityChip } from "./AvailabilityChip";
import { ProductImage } from "./ProductImage";
import { RatingLine } from "./reviews/Stars";

/**
 * A cut on the counter: tall photograph, serif name, one line of facts, the price.
 * The photograph morphs into the product page's hero on navigation (View Transitions).
 */
export async function ProductCard({
  product: p,
  priority,
  sizes = "(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw",
}: {
  product: ProductCardData;
  priority?: boolean;
  sizes?: string;
}) {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("shop");
  const he = locale === "he";
  const name = he ? p.nameHe : p.nameEn;
  const out = p.availability.kind === "OUT";

  const price =
    p.pricingMode === "WEIGHT"
      ? formatAgorot(agorot(p.pricePerKgAgorot!), locale)
      : formatAgorot(agorot(p.packagePriceAgorot!), locale);

  const facts = [
    p.agingDays ? t("card.aged", { days: p.agingDays }) : null,
    he ? p.cutOriginHe : p.cutOriginEn,
    p.pricingMode === "WEIGHT" && p.avgPieceG ? t("card.piece", { weight: formatGrams(grams(p.avgPieceG), locale) }) : null,
  ].filter(Boolean);

  return (
    <article className="group relative flex w-full flex-col gap-3">
      <div className="relative overflow-hidden rounded-[3px]">
        <ViewTransition name={`product-photo-${p.slug}`}>
          <ProductImage
            src={p.image}
            alt={name}
            animal={p.animal!}
            label={name}
            sizes={sizes}
            priority={priority}
            className={cx(
              "aspect-[4/5] [&_img]:transition-transform [&_img]:duration-[1200ms] [&_img]:ease-[cubic-bezier(.2,.7,.2,1)] group-hover:[&_img]:scale-[1.04]",
              out && "opacity-60",
            )}
          />
        </ViewTransition>
        {p.isBestSeller && (
          <span className="bg-bone-50/90 text-char-900 absolute top-3 start-3 rounded-[2px] px-2 py-1 text-[11px] font-semibold tracking-wide">
            {t("card.bestSeller")}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <h3 className="font-display text-[22px] leading-tight">
          <Link href={`/p/${p.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-wine-600">
            {name}
          </Link>
        </h3>
        {facts.length > 0 && <p className="text-char-500 line-clamp-1 text-[13px]">{facts.join(" · ")}</p>}
        {p.rating && (
          <RatingLine
            averageTenths={p.rating.averageTenths}
            count={p.rating.count}
            label={t("reviews.ariaAverage", { average: formatTenths(p.rating.averageTenths) })}
          />
        )}
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          <bdi className="text-[15px] font-semibold tabular-nums">
            {price}
            <span className="text-char-500 font-normal">
              {" "}
              {p.pricingMode === "WEIGHT" ? t("card.perKgUnit") : t("card.perPackageUnit")}
            </span>
          </bdi>
          {p.availability.kind !== "IN_STOCK" && <AvailabilityChip availability={p.availability} />}
        </div>
        <p className="text-char-500 text-xs">
          {[he ? p.authorityBadgeHe : p.authorityBadgeEn, p.glatt === "GLATT_CHALAK" ? t("kashrut.GLATT_CHALAK") : null, p.passover === "KOSHER_LEPESACH" ? t("kashrut.KOSHER_LEPESACH") : null]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
    </article>
  );
}
