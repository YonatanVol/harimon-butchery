/**
 * Customer reviews of a cut. Pure: no I/O, no dates from the clock.
 *
 * Only someone whose order was delivered may review, and only the cuts that order actually contained —
 * so every review on the site is from a real purchase. Ratings are whole stars 1–5; averages are kept as
 * integer tenths so nothing here ever needs a float.
 */

export const MIN_RATING = 1;
export const MAX_RATING = 5;
export const MAX_BODY_CHARS = 600;
export const MIN_BODY_CHARS = 10;
/** How long after delivery a review can still be written. Long enough to cook it, short enough to remember. */
export const REVIEW_WINDOW_DAYS = 90;

export type ReviewStatus = "PENDING" | "PUBLISHED" | "REJECTED";

export interface ReviewDraft {
  rating: number;
  body: string;
}

export type ReviewProblem =
  | { key: "RATING_INVALID" }
  | { key: "BODY_TOO_SHORT"; min: number }
  | { key: "BODY_TOO_LONG"; max: number };

export interface CleanReview {
  rating: number;
  body: string;
}

/** Characters as a person (and Postgres) counts them: an emoji is one, not the two units JS stores it in. */
export function charCount(text: string): number {
  return [...text].length;
}

/** Trim, collapse runs of blank lines, and check the two things a review must have. */
export function validateReview(draft: ReviewDraft): { ok: true; value: CleanReview } | { ok: false; problem: ReviewProblem } {
  // Whole stars only: half a star was never offered, so a fractional rating is something we didn't send.
  const rating = draft.rating;
  if (!Number.isInteger(rating) || rating < MIN_RATING || rating > MAX_RATING) return { ok: false, problem: { key: "RATING_INVALID" } };

  const body = draft.body.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  // Counted in characters, not in code units, so an emoji counts as the one character the database counts.
  const length = charCount(body);
  if (length < MIN_BODY_CHARS) return { ok: false, problem: { key: "BODY_TOO_SHORT", min: MIN_BODY_CHARS } };
  if (length > MAX_BODY_CHARS) return { ok: false, problem: { key: "BODY_TOO_LONG", max: MAX_BODY_CHARS } };

  return { ok: true, value: { rating, body } };
}

/**
 * How a reviewer is shown: first name and the initial of the surname ("יונתן ו."). Never the phone,
 * never the full surname, and never an empty name.
 */
export function displayNameOf(firstName: string, lastName: string): string {
  const first = firstName.trim().split(/\s+/)[0] ?? "";
  // The first character, not the first code unit — half a surrogate pair is not a letter.
  const initial = [...lastName.trim()][0] ?? "";
  if (!first) return initial ? `${initial}.` : "—";
  return initial ? `${first} ${initial}.` : first;
}

export interface RatingSummary {
  count: number;
  /** Average rating in tenths of a star (43 = 4.3). Zero when there are no reviews. */
  averageTenths: number;
  /** How many reviews gave each rating, indexed 1–5. */
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

export const EMPTY_SUMMARY: RatingSummary = {
  count: 0,
  averageTenths: 0,
  distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
};

/** Build a summary from published ratings. Ratings outside 1–5 are ignored rather than trusted. */
export function summarize(ratings: readonly number[]): RatingSummary {
  const distribution: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let total = 0;
  let count = 0;
  for (const raw of ratings) {
    const r = Math.trunc(raw);
    if (r < MIN_RATING || r > MAX_RATING) continue;
    distribution[r as 1 | 2 | 3 | 4 | 5] += 1;
    total += r;
    count += 1;
  }
  return { count, averageTenths: count === 0 ? 0 : Math.round((total * 10) / count), distribution };
}

/**
 * The same average, from totals the database already counted — so a list of cards doesn't have to load
 * every review to show a rating.
 */
export function averageTenths(count: number, ratingSum: number): number {
  return count <= 0 ? 0 : Math.round((ratingSum * 10) / count);
}

/** "4.3" from 43 — for display and for the `aggregateRating` in structured data. */
export function formatTenths(averageTenths: number): string {
  return `${Math.trunc(averageTenths / 10)}.${averageTenths % 10}`;
}

/**
 * How many of five stars to draw full, half and empty. A star is half when the average lands within the
 * middle of it (x.3 to x.7), so 4.2 shows four stars and 4.5 shows four and a half.
 */
export function starsOf(averageTenths: number): { full: number; half: boolean; empty: number } {
  const whole = Math.trunc(averageTenths / 10);
  const rest = averageTenths % 10;
  const full = rest >= 8 ? whole + 1 : whole;
  const half = rest >= 3 && rest < 8;
  return { full, half, empty: MAX_RATING - full - (half ? 1 : 0) };
}

export interface ReviewableInput {
  /** The order's status right now. */
  status: string;
  /** When the order was delivered, or null if it has not been. */
  deliveredAt: Date | null;
  /** True when this customer already reviewed this product on this order. */
  alreadyReviewed: boolean;
  now: Date;
}

export type ReviewGate =
  | { kind: "ALLOWED" }
  | { kind: "NOT_DELIVERED" }
  | { kind: "WINDOW_CLOSED"; days: number }
  | { kind: "ALREADY_REVIEWED" };

/** Whether a given order line may still be reviewed, and if not, which reason to show. */
export function reviewGate(input: ReviewableInput): ReviewGate {
  if (input.alreadyReviewed) return { kind: "ALREADY_REVIEWED" };
  if (!input.deliveredAt || (input.status !== "DELIVERED" && input.status !== "CLOSED")) return { kind: "NOT_DELIVERED" };
  const ageDays = (input.now.getTime() - input.deliveredAt.getTime()) / 86_400_000;
  if (ageDays > REVIEW_WINDOW_DAYS) return { kind: "WINDOW_CLOSED", days: REVIEW_WINDOW_DAYS };
  return { kind: "ALLOWED" };
}
