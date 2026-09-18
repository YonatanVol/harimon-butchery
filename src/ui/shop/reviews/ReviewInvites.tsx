"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { REVIEW_WINDOW_DAYS } from "@/domain/catalog/reviews";
import { ProductImage } from "../ProductImage";
import { ReviewForm } from "./ReviewForm";

export interface ReviewInvite {
  orderId: string;
  orderNumber: string;
  slug: string;
  name: string;
  image: string | null;
  animal: "BEEF" | "VEAL" | "LAMB" | "CHICKEN" | "TURKEY" | "MIXED";
  deliveredLabel: string;
}

/**
 * "Tell us how it turned out" on the account page: the cuts that arrived and have not been reviewed.
 * One form is open at a time. A cut that was just reviewed keeps its place with the thank-you showing,
 * and is gone the next time the page loads.
 */
export function ReviewInvites({ invites }: { invites: ReviewInvite[] }) {
  const t = useTranslations("shop.account");
  const [open, setOpen] = useState<string | null>(null);
  const [done, setDone] = useState<string[]>([]);
  const key = (i: ReviewInvite) => `${i.orderId}:${i.slug}`;

  if (invites.length === 0) return null;

  return (
    <section aria-labelledby="reviews-title">
      <h2 id="reviews-title" className="text-xl font-bold">
        {t("reviewsTitle")}
      </h2>
      <p className="text-char-700 mt-1">{t("reviewsBody", { days: REVIEW_WINDOW_DAYS })}</p>
      <ul className="mt-4 flex flex-col gap-3">
        {invites.map((i) => {
          const id = key(i);
          const written = done.includes(id);
          const isOpen = open === id || written;
          return (
            <li key={id} className="bg-bone-50 ring-bone-300 flex flex-col gap-3 rounded-[3px] p-4 ring-1">
              <div className="flex items-center gap-4">
                <ProductImage src={i.image} alt="" animal={i.animal} label={i.name} sizes="64px" className="size-16 shrink-0 rounded-[2px]" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="font-display text-lg">{i.name}</span>
                  <span className="text-char-500 text-sm">{i.deliveredLabel}</span>
                </div>
                {!written && (
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : id)}
                    aria-expanded={isOpen}
                    className="border-char-900 hover:bg-char-900 hover:text-bone-50 inline-flex min-h-11 shrink-0 items-center border px-4 text-sm font-semibold transition-colors"
                  >
                    {isOpen ? t("reviewsClose") : t("reviewsWrite")}
                  </button>
                )}
              </div>
              {isOpen && (
                <ReviewForm
                  orderId={i.orderId}
                  productSlug={i.slug}
                  productName={i.name}
                  orderNumber={i.orderNumber}
                  onDone={() => setDone((d) => [...d, id])}
                />
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
