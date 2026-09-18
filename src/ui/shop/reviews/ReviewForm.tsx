"use client";

import { useLocale, useTranslations } from "next-intl";
import { useId, useRef, useState, useTransition } from "react";
import { MAX_BODY_CHARS, MAX_RATING, MIN_BODY_CHARS } from "@/domain/catalog/reviews";
import { writeReview } from "@/infra/reviews/actions";
import type { SubmitProblem } from "@/infra/reviews/repository";
import { cx } from "../../cx";
import { Button } from "../../primitives/Button";

/**
 * Writing a review: stars, a few sentences, send. Everything the shop knows already — which cut, which
 * order — comes from the page, so the customer only says the two things they alone know.
 */
export function ReviewForm({
  orderId,
  productSlug,
  productName,
  orderNumber,
  onDone,
}: {
  orderId: string;
  productSlug: string;
  productName: string;
  orderNumber: string;
  onDone?: () => void;
}) {
  const t = useTranslations("shop.reviews");
  const locale = useLocale();
  const groupId = useId();
  const bodyId = useId();
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();
  const busy = useRef(false);

  const problemText = (p: SubmitProblem) => {
    switch (p.key) {
      case "BODY_TOO_SHORT":
        return t("problems.BODY_TOO_SHORT", { min: p.min });
      case "BODY_TOO_LONG":
        return t("problems.BODY_TOO_LONG", { max: p.max });
      case "WINDOW_CLOSED":
        return t("problems.WINDOW_CLOSED", { days: p.days });
      default:
        return t(`problems.${p.key}`);
    }
  };

  if (sent) {
    return (
      <p role="status" className="bg-ok-600/10 text-ok-600 rounded-[2px] p-3 font-medium">
        {t("form.sent")}
      </p>
    );
  }

  const tooShort = body.trim().length < MIN_BODY_CHARS;
  const remaining = MAX_BODY_CHARS - body.length;

  return (
    <form
      className="border-bone-300 flex flex-col gap-4 border-t pt-4"
      onSubmit={(e) => {
        e.preventDefault();
        // One send at a time: a second tap while the first is in flight would be refused as a duplicate.
        if (busy.current) return;
        busy.current = true;
        setError(null);
        start(async () => {
          try {
            const r = await writeReview({ orderId, productSlug, rating, body, locale });
            if (!r.ok) {
              setError(problemText(r.problem));
              return;
            }
            setSent(true);
            onDone?.();
          } catch {
            setError(t("problems.NETWORK"));
          } finally {
            busy.current = false;
          }
        });
      }}
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="font-semibold">{t("form.title", { name: productName })}</legend>
        <p className="text-char-500 text-sm">{t("form.orderLine", { order: orderNumber })}</p>
        <div className="mt-1 flex items-center gap-2" role="radiogroup" aria-label={t("form.rating")}>
          {Array.from({ length: MAX_RATING }, (_, i) => i + 1).map((n) => (
            <label
              key={n}
              className={cx(
                "grid size-11 cursor-pointer place-items-center rounded-[2px] ring-1 ring-inset transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-wine-600",
                n <= rating ? "text-brass-700 ring-brass-500" : "text-bone-400 ring-bone-300 hover:ring-char-900",
              )}
            >
              <input
                type="radio"
                name={`${groupId}-rating`}
                value={n}
                checked={rating === n}
                onChange={() => setRating(n)}
                className="sr-only"
                aria-label={t("form.star", { count: n })}
              />
              <svg viewBox="0 0 24 24" className="size-6" aria-hidden>
                <path
                  d="M12 2.6l2.65 5.9 6.35.66-4.75 4.3 1.35 6.3L12 16.5l-5.6 3.26 1.35-6.3L3 9.16l6.35-.66L12 2.6z"
                  fill={n <= rating ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth={n <= rating ? 0 : 1.4}
                />
              </svg>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-1">
        <label htmlFor={bodyId} className="font-semibold">
          {t("form.body")}
        </label>
        <p className="text-char-500 text-sm">{t("form.bodyHelp", { min: MIN_BODY_CHARS, max: MAX_BODY_CHARS })}</p>
        <textarea
          id={bodyId}
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, MAX_BODY_CHARS))}
          rows={4}
          maxLength={MAX_BODY_CHARS}
          className="bg-bone-50 border-bone-300 focus:ring-wine-600 mt-1 w-full rounded-[2px] border p-3 outline-none focus:ring-2"
        />
        <p className="text-char-500 text-sm" aria-live="polite">
          {t("form.remaining", { count: remaining })}
        </p>
      </div>

      <p className="text-char-500 text-sm">{t("form.nameNote")}</p>

      <div className="flex flex-wrap items-start gap-3">
        <Button
          type="submit"
          disabledReason={rating === 0 ? t("form.ratingMissing") : tooShort ? t("form.bodyMissing", { min: MIN_BODY_CHARS }) : null}
          pendingLabel={pending ? t("form.sending") : null}
        >
          {t("form.submit")}
        </Button>
      </div>

      {error && (
        <p role="alert" className="bg-bad-600/10 text-bad-600 rounded-[2px] p-3 text-sm font-medium">
          {error}
        </p>
      )}
    </form>
  );
}
