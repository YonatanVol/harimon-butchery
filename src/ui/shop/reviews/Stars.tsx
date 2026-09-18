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
        <Star key={`f${i}`} className={px} filled />
      ))}
      {half && <HalfStar className={px} />}
      {Array.from({ length: empty }, (_, i) => (
        <Star key={`e${i}`} className={px} filled={false} />
      ))}
    </span>
  );
}

/** The rating a single review gave: whole stars only, so no halves here. */
export function RatingStars({ rating, label, size = "md" }: { rating: number; label: string; size?: "sm" | "md" | "lg" }) {
  return <Stars averageTenths={Math.min(MAX_RATING, Math.max(0, Math.trunc(rating))) * 10} label={label} size={size} />;
}

const PATH = "M12 2.6l2.65 5.9 6.35.66-4.75 4.3 1.35 6.3L12 16.5l-5.6 3.26 1.35-6.3L3 9.16l6.35-.66L12 2.6z";

function Star({ className, filled }: { className: string; filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={cx("shrink-0", className)} aria-hidden>
      <path d={PATH} fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={filled ? 0 : 1.4} />
    </svg>
  );
}

/**
 * One star drawn twice: the outline, and a full star behind a box half as wide. The box is measured with
 * `inline-size` from the inline start, so the filled half is the leading half in Hebrew as in English.
 */
function HalfStar({ className }: { className: string }) {
  return (
    <span className={cx("relative inline-grid shrink-0", className)}>
      <Star className="size-full" filled={false} />
      <span className="absolute inset-block-0 start-0 w-1/2 overflow-hidden">
        <Star className={cx("max-w-none", className)} filled />
      </span>
    </span>
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
