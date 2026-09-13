import { getLocale, getTranslations } from "next-intl/server";
import { agorot } from "@/domain/money/agorot";
import { formatAgorot } from "@/domain/money/format";
import { formatGrams, grams } from "@/domain/weight/grams";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { ProductCard as ProductCardData } from "@/infra/db/queries/catalog";
import { cx } from "../cx";
import { Badge } from "../primitives/Badge";
import { AvailabilityChip } from "./AvailabilityChip";
import { ProductImage } from "./ProductImage";

export async function ProductCard({ product: p, priority }: { product: ProductCardData; priority?: boolean }) {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("shop");
  const name = locale === "he" ? p.nameHe : p.nameEn;
  const out = p.availability.kind === "OUT";

  const price =
    p.pricingMode === "WEIGHT"
      ? t("card.perKg", { price: formatAgorot(agorot(p.pricePerKgAgorot!), locale) })
      : t("card.perPackage", { price: formatAgorot(agorot(p.packagePriceAgorot!), locale) });

  return (
    <article className="group relative flex w-full flex-col overflow-hidden rounded-2xl bg-bone-50 ring-1 ring-bone-300 transition-shadow hover:shadow-lg hover:ring-bone-300">
      <ProductImage
        src={p.image}
        alt={name}
        animal={p.animal!}
        label={name}
        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
        priority={priority}
        className={cx("aspect-[4/3] transition-opacity", out && "opacity-60")}
      />
      <div className="absolute inset-x-3 top-3 flex flex-wrap gap-1.5">
        {p.isBestSeller && <Badge tone="wine" className="bg-bone-50/95">{t("card.bestSeller")}</Badge>}
        {p.agingDays ? <Badge className="bg-bone-50/95">{t("card.aged", { days: p.agingDays })}</Badge> : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="text-lg leading-snug font-semibold">
          <Link
            href={`/p/${p.slug}`}
            className="after:absolute after:inset-0 focus-visible:outline-none after:rounded-2xl focus-visible:after:outline-2 focus-visible:after:outline-wine-500"
          >
            {name}
          </Link>
        </h3>
        <p className="text-char-700 font-reading line-clamp-2 text-sm">{locale === "he" ? p.shortDescHe : p.shortDescEn}</p>
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
          <Badge>{locale === "he" ? p.authorityBadgeHe : p.authorityBadgeEn}</Badge>
          {p.glatt === "GLATT_CHALAK" && <Badge tone="wine">{t("kashrut.GLATT_CHALAK")}</Badge>}
          {p.passover === "KOSHER_LEPESACH" && <Badge>{t("kashrut.KOSHER_LEPESACH")}</Badge>}
        </div>
        <div className="flex items-end justify-between gap-2 pt-2">
          <div className="flex flex-col">
            <bdi className="text-lg font-semibold tabular-nums">{price}</bdi>
            {p.pricingMode === "WEIGHT" && p.avgPieceG ? (
              <span className="text-char-500 text-xs">
                {t("card.piece", { weight: formatGrams(grams(p.avgPieceG), locale) })}
              </span>
            ) : null}
          </div>
          <AvailabilityChip availability={p.availability} />
        </div>
      </div>
    </article>
  );
}
