import { and, desc, eq, inArray, isNull, notInArray, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  averageTenths,
  displayNameOf,
  EMPTY_SUMMARY,
  type RatingSummary,
  type ReviewProblem,
  reviewGate,
  validateReview,
} from "@/domain/catalog/reviews";
import type * as schema from "../db/schema";
import { customer, order, orderLine, product, productReview, productVariant } from "../db/schema";

type Database = NodePgDatabase<typeof schema>;

/** The order states in which a cut has reached the customer. */
const DELIVERED_ORDER: Array<(typeof order.$inferSelect)["status"]> = ["DELIVERED", "CLOSED"];

/**
 * A line the customer actually received. A cut that was short, cancelled, or swapped for another one
 * never reached the kitchen, so it can never be reviewed — "verified purchase" has to mean it.
 * A refunded line stays: it did arrive, and the money coming back is often exactly what to write about.
 */
const DID_NOT_ARRIVE: Array<(typeof orderLine.$inferSelect)["status"]> = ["SHORT", "CANCELLED", "SUBSTITUTED"];
const lineArrived = () => and(notInArray(orderLine.status, DID_NOT_ARRIVE), isNull(orderLine.substitutedWithVariantId));

export type SubmitProblem = ReviewProblem | { key: "NOT_SIGNED_IN" } | { key: "NOT_FOUND" } | { key: "NOT_DELIVERED" } | { key: "WINDOW_CLOSED"; days: number } | { key: "ALREADY_REVIEWED" };
export type SubmitResult = { ok: true } | { ok: false; problem: SubmitProblem };

/** Published reviews of one cut, newest first, with the butcher's reply if there is one. */
export async function reviewsFor(db: Database, productId: string, limit = 20) {
  return db
    .select({
      id: productReview.id,
      rating: productReview.rating,
      body: productReview.body,
      displayName: productReview.displayName,
      locale: productReview.locale,
      createdAt: productReview.createdAt,
      replyBody: productReview.replyBody,
      repliedAt: productReview.repliedAt,
    })
    .from(productReview)
    .where(and(eq(productReview.productId, productId), eq(productReview.status, "PUBLISHED")))
    .orderBy(desc(productReview.createdAt))
    .limit(limit);
}

/** Count and star distribution for one cut, straight from the database. */
export async function summaryFor(db: Database, productId: string): Promise<RatingSummary> {
  const rows = await db
    .select({ rating: productReview.rating, n: sql<number>`count(*)::int` })
    .from(productReview)
    .where(and(eq(productReview.productId, productId), eq(productReview.status, "PUBLISHED")))
    .groupBy(productReview.rating);

  const distribution = { ...EMPTY_SUMMARY.distribution };
  let count = 0;
  let total = 0;
  for (const row of rows) {
    if (row.rating < 1 || row.rating > 5) continue;
    distribution[row.rating as 1 | 2 | 3 | 4 | 5] = row.n;
    count += row.n;
    total += row.rating * row.n;
  }
  return { count, averageTenths: averageTenths(count, total), distribution };
}

export interface ReviewableLine {
  orderId: string;
  orderNumber: string;
  deliveredAt: Date;
  productId: string;
  slug: string;
  nameHe: string;
  nameEn: string;
  image: string | null;
  animal: (typeof product.$inferSelect)["animal"];
}

/**
 * Cuts this customer was delivered and has not reviewed yet, newest delivery first. One row per cut per
 * order, because that is exactly what a review belongs to.
 */
export async function reviewableFor(db: Database, phoneE164: string, now = new Date(), limit = 12): Promise<ReviewableLine[]> {
  const rows = await db
    .selectDistinctOn([order.id, product.id], {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      deliveredAt: order.deliveredAt,
      productId: product.id,
      slug: product.slug,
      nameHe: product.nameHe,
      nameEn: product.nameEn,
      image: product.image,
      animal: product.animal,
      reviewId: productReview.id,
    })
    .from(order)
    .innerJoin(customer, eq(customer.id, order.customerId))
    .innerJoin(orderLine, eq(orderLine.orderId, order.id))
    .innerJoin(productVariant, eq(productVariant.id, orderLine.variantId))
    .innerJoin(product, eq(product.id, productVariant.productId))
    .leftJoin(productReview, and(eq(productReview.orderId, order.id), eq(productReview.productId, product.id)))
    .where(and(eq(customer.phoneE164, phoneE164), inArray(order.status, DELIVERED_ORDER), lineArrived()))
    // A wide bound on the read; the review window and the limit below decide what is actually offered.
    .limit(200);

  return rows
    .filter((r) => reviewGate({ status: r.status, deliveredAt: r.deliveredAt, alreadyReviewed: r.reviewId !== null, now }).kind === "ALLOWED")
    .sort((a, b) => (b.deliveredAt?.getTime() ?? 0) - (a.deliveredAt?.getTime() ?? 0))
    .slice(0, limit)
    .map((r) => ({
      orderId: r.orderId,
      orderNumber: r.orderNumber,
      deliveredAt: r.deliveredAt!,
      productId: r.productId,
      slug: r.slug,
      nameHe: r.nameHe,
      nameEn: r.nameEn,
      image: r.image,
      animal: r.animal,
    }));
}

export interface SubmitInput {
  phoneE164: string;
  orderId: string;
  productSlug: string;
  rating: number;
  body: string;
  locale: "he" | "en";
  now?: Date;
}

/**
 * Write a review. Every condition is re-checked here against the database: the order is this customer's,
 * it was delivered, it contained this cut, the window is open, and there is no review for it yet.
 */
export async function submitReview(db: Database, input: SubmitInput): Promise<SubmitResult> {
  const clean = validateReview({ rating: input.rating, body: input.body });
  if (!clean.ok) return { ok: false, problem: clean.problem };

  const [row] = await db
    .select({
      orderId: order.id,
      status: order.status,
      deliveredAt: order.deliveredAt,
      customerId: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      productId: product.id,
      reviewId: productReview.id,
    })
    .from(order)
    .innerJoin(customer, eq(customer.id, order.customerId))
    .innerJoin(orderLine, eq(orderLine.orderId, order.id))
    .innerJoin(productVariant, eq(productVariant.id, orderLine.variantId))
    .innerJoin(product, eq(product.id, productVariant.productId))
    .leftJoin(productReview, and(eq(productReview.orderId, order.id), eq(productReview.productId, product.id)))
    .where(and(eq(order.id, input.orderId), eq(customer.phoneE164, input.phoneE164), eq(product.slug, input.productSlug), lineArrived()))
    .limit(1);

  if (!row) return { ok: false, problem: { key: "NOT_FOUND" } };

  const gate = reviewGate({ status: row.status, deliveredAt: row.deliveredAt, alreadyReviewed: row.reviewId !== null, now: input.now ?? new Date() });
  if (gate.kind === "NOT_DELIVERED") return { ok: false, problem: { key: "NOT_DELIVERED" } };
  if (gate.kind === "WINDOW_CLOSED") return { ok: false, problem: { key: "WINDOW_CLOSED", days: gate.days } };
  if (gate.kind === "ALREADY_REVIEWED") return { ok: false, problem: { key: "ALREADY_REVIEWED" } };

  const inserted = await db
    .insert(productReview)
    .values({
      productId: row.productId,
      orderId: row.orderId,
      customerId: row.customerId,
      rating: clean.value.rating,
      body: clean.value.body,
      displayName: displayNameOf(row.firstName, row.lastName),
      locale: input.locale,
    })
    // Two taps on "send" must not become two reviews; the unique index decides, not the read above.
    .onConflictDoNothing({ target: [productReview.orderId, productReview.productId] })
    .returning({ id: productReview.id });

  return inserted.length === 0 ? { ok: false, problem: { key: "ALREADY_REVIEWED" } } : { ok: true };
}

/** Everything a moderator needs: the review, the cut it is about, and the order it came from. */
export async function listForModeration(db: Database, status: "PENDING" | "PUBLISHED" | "REJECTED", limit = 100) {
  return db
    .select({
      id: productReview.id,
      rating: productReview.rating,
      body: productReview.body,
      displayName: productReview.displayName,
      locale: productReview.locale,
      status: productReview.status,
      createdAt: productReview.createdAt,
      moderationNote: productReview.moderationNote,
      replyBody: productReview.replyBody,
      orderNumber: order.orderNumber,
      productSlug: product.slug,
      productNameHe: product.nameHe,
      productNameEn: product.nameEn,
    })
    .from(productReview)
    .innerJoin(product, eq(product.id, productReview.productId))
    .innerJoin(order, eq(order.id, productReview.orderId))
    .where(eq(productReview.status, status))
    .orderBy(desc(productReview.createdAt))
    .limit(limit);
}

export async function countPending(db: Database): Promise<number> {
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(productReview).where(eq(productReview.status, "PENDING"));
  return row?.n ?? 0;
}

export async function moderateReview(
  db: Database,
  input: { id: string; staffId: string; decision: "PUBLISHED" | "REJECTED"; note?: string | null },
): Promise<{ slug: string; nameHe: string; nameEn: string } | null> {
  const [cut] = await db
    .select({ slug: product.slug, nameHe: product.nameHe, nameEn: product.nameEn })
    .from(productReview)
    .innerJoin(product, eq(product.id, productReview.productId))
    .where(eq(productReview.id, input.id));
  if (!cut) return null;

  const rows = await db
    .update(productReview)
    .set({
      status: input.decision,
      moderatedByStaffId: input.staffId,
      moderatedAt: new Date(),
      moderationNote: input.note?.trim() ? input.note.trim().slice(0, 300) : null,
    })
    .where(eq(productReview.id, input.id))
    .returning({ id: productReview.id });
  return rows.length > 0 ? cut : null;
}

/** The butcher's public answer. An empty reply removes one that was there. */
export async function replyToReview(db: Database, input: { id: string; body: string }): Promise<{ slug: string } | null> {
  const body = input.body.trim().slice(0, 600);
  const [current] = await db
    .select({ repliedAt: productReview.repliedAt, slug: product.slug })
    .from(productReview)
    .innerJoin(product, eq(product.id, productReview.productId))
    .where(eq(productReview.id, input.id));
  if (!current) return null;

  await db
    .update(productReview)
    // Fixing a typo in a reply does not make it a new reply, so its date stands.
    .set(body ? { replyBody: body, repliedAt: current.repliedAt ?? new Date() } : { replyBody: null, repliedAt: null })
    .where(eq(productReview.id, input.id));
  return { slug: current.slug };
}
