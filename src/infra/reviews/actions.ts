"use server";

import { refresh, revalidatePath } from "next/cache";
import { z } from "zod";
import { can, type StaffRole } from "@/domain/auth/permissions";
import { MAX_BODY_CHARS } from "@/domain/catalog/reviews";
import { routing } from "@/i18n/routing";
import { currentCustomerPhone } from "../customer/session";
import { db } from "../db/client";
import { auditEvent } from "../db/schema";
import { currentStaff } from "../staff/session";
import { moderateReview, replyToReview, type SubmitResult, submitReview } from "./repository";

const id = z.string().uuid();
const slug = z.string().min(1).max(80);

/** A customer writes a review of a cut from one of their delivered orders. */
export async function writeReview(input: { orderId: string; productSlug: string; rating: number; body: string; locale: string }): Promise<SubmitResult> {
  const phone = await currentCustomerPhone();
  if (!phone) return { ok: false, problem: { key: "NOT_SIGNED_IN" } };
  if (!id.safeParse(input.orderId).success || !slug.safeParse(input.productSlug).success) return { ok: false, problem: { key: "NOT_FOUND" } };

  const result = await submitReview(db, {
    phoneE164: phone,
    orderId: input.orderId,
    productSlug: input.productSlug,
    rating: Number(input.rating),
    body: String(input.body ?? "").slice(0, MAX_BODY_CHARS + 1),
    locale: input.locale === "en" ? "en" : "he",
  });
  // No refresh: nothing public changed yet, and re-rendering would replace the thank-you with a blank list.
  return result;
}

type StaffResult = { ok: true } | { ok: false; problem: { key: "NOT_PERMITTED" | "NOT_FOUND" } };

/** Publish or reject a review. Both decisions are written to the staff log. */
export async function staffModerateReview(input: { id: string; decision: "PUBLISHED" | "REJECTED"; note: string }): Promise<StaffResult> {
  const staff = await currentStaff();
  if (!staff || !can(staff.role as StaffRole, "MODERATE_REVIEWS")) return { ok: false, problem: { key: "NOT_PERMITTED" } };
  if (!id.safeParse(input.id).success || (input.decision !== "PUBLISHED" && input.decision !== "REJECTED")) return { ok: false, problem: { key: "NOT_FOUND" } };

  const cut = await moderateReview(db, { id: input.id, staffId: staff.id, decision: input.decision, note: input.note });
  if (!cut) return { ok: false, problem: { key: "NOT_FOUND" } };

  await db.insert(auditEvent).values({
    actorType: "STAFF",
    actorId: staff.id,
    entityType: "product_review",
    entityId: input.id,
    action: input.decision === "PUBLISHED" ? "review.publish" : "review.reject",
    // The cut's name goes in the entry itself: the log resolves orders and products, not reviews.
    after: { decision: input.decision, slug: cut.slug, nameHe: cut.nameHe, nameEn: cut.nameEn, note: input.note?.trim()?.slice(0, 300) || null },
  });

  // A published review changes what every catalog page shows.
  revalidatePath("/[locale]", "layout");
  refresh();
  return { ok: true };
}

/** The butcher's public answer under a review. Sending an empty answer removes the one that is there. */
export async function staffReplyToReview(input: { id: string; body: string }): Promise<StaffResult> {
  const staff = await currentStaff();
  if (!staff || !can(staff.role as StaffRole, "MODERATE_REVIEWS")) return { ok: false, problem: { key: "NOT_PERMITTED" } };
  if (!id.safeParse(input.id).success) return { ok: false, problem: { key: "NOT_FOUND" } };

  const replied = await replyToReview(db, { id: input.id, body: String(input.body ?? "") });
  if (!replied) return { ok: false, problem: { key: "NOT_FOUND" } };

  await db.insert(auditEvent).values({
    actorType: "STAFF",
    actorId: staff.id,
    entityType: "product_review",
    entityId: input.id,
    action: "review.reply",
    after: { replied: Boolean(String(input.body ?? "").trim()), slug: replied.slug },
  });

  // A reply shows on one cut's page and nowhere else, so only that page is rebuilt.
  for (const locale of routing.locales) revalidatePath(`/${locale}/p/${replied.slug}`);
  refresh();
  return { ok: true };
}
