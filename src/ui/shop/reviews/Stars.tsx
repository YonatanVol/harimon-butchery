import { formatTenths, MAX_RATING, starsOf } from "@/domain/catalog/reviews";
import { cx } from "../../cx";

/**
 * Five stars, drawn the way the average rounds them: whole, half, empty. The label carries the meaning
 * for anyone not looking at the shapes, so the stars themselves are decoration.
 */
export function Stars({ averageTenths, label, size = "md" }: { averageTenths: number; label: string; size?: "sm" | "md" | "lg" }) {
  const { full, half, empty } = starsOf(averageTenths);
  const px = size === "sm" ? "size-3.5" : size === "lg" ? "size-6" : "size-[18px]";

  return (
    <span role="img" aria-label={label} className="text-brass-500 inline-flex items-center gap-0.5 align-middle">
      {Array.from({ length: full }, (_, i) => (
        <Star key={`f${i}`} className={px} fill="full" />
      ))}
      {half && <Star className={px} fill="half" />}
      {Array.from({ length: empty }, (_, i) => (
        <Star key={`e${i}`} className={px} fill="empty" />
      ))}
    </span>
  );
}

/** The rating a single review gave: whole stars only, so no halves here. */
export function RatingStars({ rating, label, size = "md" }: { rating: number; label: string; size?: "sm" | "md" | "lg" }) {
  return <Stars averageTenths={Math.min(MAX_RATING, Math.max(0, Math.trunc(rating))) * 10} label={label} size={size} />;
}

const PATH =
  "M12 2.6l2.65 5.9 6.35.66-4.75 4.3 1.35 6.3L12 16.5l-5.6 3.26 1.35-6.3L3 9.16l6.35-.66L12 2.6z";

function Star({ className, fill }: { className: string; fill: "full" | "half" | "empty" }) {
  if (fill === "half") {
    // One star drawn twice: the outline, then the same shape clipped to the leading half.
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden>
        <defs>
          <clipPath id="half-star-clip">
            <rect x="0" y="0" width="12" height="24" />
          </clipPath>
        </defs>
        <path d={PATH} fill="none" stroke="currentColor" strokeWidth="1.4" />
        {/* The clip is in the SVG's own coordinates, which do not flip with the page direction. */}
        <path d={PATH} fill="currentColor" clipPath="url(#half-star-clip)" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={cx(className)} aria-hidden>
      <path d={PATH} fill={fill === "full" ? "currentColor" : "none"} stroke="currentColor" strokeWidth={fill === "full" ? 0 : 1.4} />
    </svg>
  );
}

/** The compact form on a product card: stars, the number, and how many people wrote one. */
export function RatingLine({ averageTenths, count, label, className }: { averageTenths: number; count: number; label: string; className?: string }) {
  return (
    <span className={cx("text-char-500 inline-flex items-center gap-1.5 text-[13px]", className)}>
      <Stars averageTenths={averageTenths} label={label} size="sm" />
      <bdi className="tabular-nums">
        {formatTenths(averageTenths)} ({count})
      </bdi>
    </span>
  );
}
