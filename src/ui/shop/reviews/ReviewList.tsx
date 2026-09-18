import { getFormatter, getTranslations } from "next-intl/server";
import { formatTenths, MAX_RATING, type RatingSummary } from "@/domain/catalog/reviews";
import { RatingStars, Stars } from "./Stars";

export interface ShownReview {
  id: string;
  rating: number;
  body: string;
  displayName: string;
  createdAt: Date;
  replyBody: string | null;
  repliedAt: Date | null;
}

/**
 * What people who bought this cut said. The empty state says who is allowed to write here, because that
 * is the whole reason these ratings mean anything.
 */
export async function ReviewList({ summary, reviews }: { summary: RatingSummary; reviews: ShownReview[] }) {
  const t = await getTranslations("shop.reviews");
  const format = await getFormatter();

  if (summary.count === 0) {
    return (
      <div className="border-bone-300 flex flex-col gap-2 border-t pt-6">
        <p className="text-char-700 text-lg">{t("empty")}</p>
        <p className="text-char-500 max-w-prose text-sm leading-relaxed">{t("emptyWho")}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,18rem)_1fr]">
      <div className="flex flex-col gap-4 lg:sticky lg:top-32 lg:self-start">
        <div className="flex items-center gap-3">
          <span className="font-display text-5xl leading-none tabular-nums">{formatTenths(summary.averageTenths)}</span>
          <span className="flex flex-col gap-1">
            <Stars averageTenths={summary.averageTenths} label={t("ariaAverage", { average: formatTenths(summary.averageTenths) })} />
            <span className="text-char-500 text-sm">{t("count", { count: summary.count })}</span>
          </span>
        </div>

        <ul className="flex flex-col gap-1.5">
          {([5, 4, 3, 2, 1] as const).map((stars) => {
            const n = summary.distribution[stars];
            const share = Math.round((n * 100) / summary.count);
            return (
              <li key={stars} className="flex items-center gap-2 text-sm">
                <span className="text-char-500 w-16 shrink-0">{t("bar", { stars })}</span>
                <span className="bg-bone-200 h-1.5 flex-1 overflow-hidden rounded-full">
                  {/* The bar is the picture of the number that follows it, so it needs no label of its own. */}
                  <span aria-hidden className="bg-brass-500 block h-full" style={{ inlineSize: `${share}%` }} />
                </span>
                <bdi className="text-char-500 w-8 shrink-0 text-end tabular-nums">{n}</bdi>
              </li>
            );
          })}
        </ul>

        <p className="text-char-500 max-w-prose text-xs leading-relaxed">{t("moderation")}</p>
      </div>

      <ul className="flex flex-col">
        {reviews.map((r) => (
          <li key={r.id} className="border-bone-300 flex flex-col gap-2 border-t py-6 first:border-t-0 first:pt-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <RatingStars rating={r.rating} label={t("ariaRating", { rating: r.rating })} size="sm" />
              <span className="font-semibold">{r.displayName}</span>
              <span className="text-brass-700 text-xs font-semibold">{t("verified")}</span>
              <span className="text-char-500 text-sm">{format.dateTime(r.createdAt, { day: "numeric", month: "long", year: "numeric" })}</span>
            </div>
            <p className="text-[17px] leading-relaxed whitespace-pre-line">{r.body}</p>
            {r.replyBody && (
              <div className="bg-bone-100 border-brass-500 mt-1 flex flex-col gap-1 border-s-2 p-4">
                <span className="text-xs font-semibold tracking-[0.06em]">{t("reply")}</span>
                <p className="text-char-700 leading-relaxed whitespace-pre-line">{r.replyBody}</p>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The `aggregateRating` search engines read, only ever from ratings that are actually published. */
export function ratingJsonLd(summary: RatingSummary) {
  if (summary.count === 0) return undefined;
  return {
    "@type": "AggregateRating",
    ratingValue: formatTenths(summary.averageTenths),
    reviewCount: summary.count,
    bestRating: MAX_RATING,
    worstRating: 1,
  };
}
