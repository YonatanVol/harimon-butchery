import { and, asc, eq } from "drizzle-orm";
import { type LineProblem, snapToCut } from "@/domain/cart/cart";
import { addLine, cartLineCount } from "../cart/add";
import { db } from "../db/client";
import { customer, order, orderLine, product, productVariant } from "../db/schema";

/**
 * "Order this again": the same cuts as a past order, in the amounts that were actually delivered, at
 * today's prices. Anything that cannot go in — sold out, no longer sold, a weight the cut no longer
 * allows — is named rather than dropped quietly.
 */

export interface ReorderLine {
  slug: string;
  nameHe: string;
  nameEn: string;
  added: boolean;
  /** Why this cut could not be added. Null when it was. */
  problem: LineProblem | null;
}

export type ReorderResult =
  | { ok: true; count: number; lines: ReorderLine[] }
  | { ok: false; problem: { key: "NOT_FOUND" } | { key: "NOTHING_TO_ADD"; lines: ReorderLine[] } };

/** The line statuses that never reached the customer, and so are not part of "the same order again". */
const DID_NOT_ARRIVE: Array<(typeof orderLine.$inferSelect)["status"]> = ["SHORT", "CANCELLED", "SUBSTITUTED"];

export interface ReorderInput {
  orderNumber: string;
  /** The signed-in customer's phone, or null when they came from a tracking link. */
  phoneE164: string | null;
  /** The order's own tracking token, for someone following the link without signing in. */
  accessToken: string | null;
}

export async function reorderInto(cartId: string, input: ReorderInput): Promise<ReorderResult> {
  // The order must be proved to be theirs: their verified phone, or the unguessable token from their link.
  const owns = input.phoneE164
    ? eq(customer.phoneE164, input.phoneE164)
    : input.accessToken
      ? eq(order.accessToken, input.accessToken)
      : null;
  if (!owns) return { ok: false, problem: { key: "NOT_FOUND" } };

  const rows = await db
    .select({
      variantId: orderLine.variantId,
      status: orderLine.status,
      pricingMode: orderLine.pricingMode,
      estimatedG: orderLine.estimatedG,
      actualG: orderLine.actualG,
      quantity: orderLine.quantity,
      actualQuantity: orderLine.actualQuantity,
      note: orderLine.customerNote,
      minOrderG: product.minOrderG,
      maxOrderG: product.maxOrderG,
      stepG: product.stepG,
      slug: product.slug,
      nameHe: product.nameHe,
      nameEn: product.nameEn,
    })
    .from(order)
    .innerJoin(customer, eq(customer.id, order.customerId))
    .innerJoin(orderLine, eq(orderLine.orderId, order.id))
    .innerJoin(productVariant, eq(productVariant.id, orderLine.variantId))
    .innerJoin(product, eq(product.id, productVariant.productId))
    .where(and(eq(order.orderNumber, input.orderNumber), owns))
    .orderBy(asc(orderLine.id));

  if (rows.length === 0) return { ok: false, problem: { key: "NOT_FOUND" } };

  const lines: ReorderLine[] = [];
  for (const row of rows) {
    if (DID_NOT_ARRIVE.includes(row.status)) continue;
    // What was actually delivered, or what was asked for if it was never weighed — snapped back to a
    // weight the butcher can cut, because a scale reading of 2,613 g is not something the shop sells.
    const delivered = row.pricingMode === "WEIGHT" ? (row.actualG ?? row.estimatedG) : null;
    const requestedG =
      delivered !== null && row.minOrderG !== null && row.maxOrderG !== null && row.stepG !== null
        ? snapToCut(delivered, { minOrderG: row.minOrderG, maxOrderG: row.maxOrderG, stepG: row.stepG })
        : delivered;
    const quantity = row.pricingMode === "PACKAGE" ? (row.actualQuantity ?? row.quantity) : null;

    const added = await addLine(cartId, { variantId: row.variantId, requestedG, quantity, note: row.note });
    lines.push({ slug: row.slug, nameHe: row.nameHe, nameEn: row.nameEn, added: added.ok, problem: added.ok ? null : added.problem });
  }

  if (lines.length === 0 || lines.every((l) => !l.added)) return { ok: false, problem: { key: "NOTHING_TO_ADD", lines } };
  return { ok: true, count: await cartLineCount(cartId), lines };
}
