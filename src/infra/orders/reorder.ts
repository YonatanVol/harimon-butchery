import { timingSafeEqual } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import { type LineProblem, snapToCut } from "@/domain/cart/cart";
import { addLine, cartLineCount } from "../cart/add";
import { db } from "../db/client";
import { customer, order, orderLine, product, productVariant } from "../db/schema";

/**
 * "Order this again": the same cuts as a past order, in the amounts that were actually delivered, at
 * today's prices. Anything that cannot go in — sold out, no longer sold, a weight the cut no longer
 * allows — is named rather than dropped quietly, and a weight that had to change says so.
 *
 * Pressing it twice leaves the same cart as pressing it once: the cuts are set to the order's amounts,
 * not piled on top of themselves.
 */

export interface ReorderLine {
  /** The exact cut and preparation, which is what a line is really about. */
  variantId: string;
  slug: string;
  nameHe: string;
  nameEn: string;
  variantNameHe: string;
  variantNameEn: string;
  added: boolean;
  /** Why this cut could not be added. Null when it was. */
  problem: LineProblem | null;
  /** What was delivered, and what the cart could take, when the two differ. */
  changed: { fromG: number; toG: number } | null;
}

export type ReorderResult =
  | { ok: true; count: number; lines: ReorderLine[] }
  | { ok: false; problem: { key: "NOT_FOUND" } | { key: "NOTHING_ARRIVED" } | { key: "NOTHING_TO_ADD"; lines: ReorderLine[] } };

/** The line statuses that never reached the customer, and so are not part of "the same order again". */
const DID_NOT_ARRIVE: Array<(typeof orderLine.$inferSelect)["status"]> = ["SHORT", "CANCELLED", "SUBSTITUTED"];

export interface ReorderInput {
  orderNumber: string;
  /** The signed-in customer's phone, or null when nobody is signed in. */
  phoneE164: string | null;
  /** The order's own tracking token, for someone following their link. */
  accessToken: string | null;
}

/** Constant-time, like every other place in the shop that checks one of these tokens. */
function sameToken(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function reorderInto(cartId: string, input: ReorderInput): Promise<ReorderResult> {
  if (!input.phoneE164 && !input.accessToken) return { ok: false, problem: { key: "NOT_FOUND" } };

  const rows = await db
    .select({
      ownerPhone: customer.phoneE164,
      accessToken: order.accessToken,
      variantId: orderLine.variantId,
      status: orderLine.status,
      pricingMode: orderLine.pricingMode,
      estimatedG: orderLine.estimatedG,
      actualG: orderLine.actualG,
      quantity: orderLine.quantity,
      actualQuantity: orderLine.actualQuantity,
      note: orderLine.customerNote,
      variantNameHe: orderLine.variantNameHe,
      variantNameEn: orderLine.variantNameEn,
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
    .where(eq(order.orderNumber, input.orderNumber))
    // The order the customer wrote it in, which is the order the shop picked and printed it in.
    .orderBy(asc(orderLine.sortOrder), asc(orderLine.id));

  // Either proof is enough, and either may be the one that matches: someone signed in with their own
  // number can still be holding the link to an order placed on another.
  const owned =
    rows.length > 0 &&
    ((input.phoneE164 !== null && rows[0].ownerPhone === input.phoneE164) ||
      (input.accessToken !== null && sameToken(rows[0].accessToken, input.accessToken)));
  if (!owned) return { ok: false, problem: { key: "NOT_FOUND" } };

  const arrived = rows.filter((row) => !DID_NOT_ARRIVE.includes(row.status));
  if (arrived.length === 0) return { ok: false, problem: { key: "NOTHING_ARRIVED" } };

  const lines: ReorderLine[] = [];
  for (const row of arrived) {
    // What was actually delivered, or what was asked for if it was never weighed — snapped back to a
    // weight the butcher can cut, because a scale reading of 2,613 g is not something the shop sells.
    const delivered = row.pricingMode === "WEIGHT" ? (row.actualG ?? row.estimatedG) : null;
    const requestedG =
      delivered !== null && row.minOrderG !== null && row.maxOrderG !== null && row.stepG !== null
        ? snapToCut(delivered, { minOrderG: row.minOrderG, maxOrderG: row.maxOrderG, stepG: row.stepG })
        : delivered;
    const quantity = row.pricingMode === "PACKAGE" ? (row.actualQuantity ?? row.quantity) : null;

    // "Set", not "add": pressing the button twice must leave the same cart as pressing it once.
    const added = await addLine(cartId, { variantId: row.variantId, requestedG, quantity, note: row.note, mode: "SET" });
    lines.push({
      variantId: row.variantId,
      slug: row.slug,
      nameHe: row.nameHe,
      nameEn: row.nameEn,
      variantNameHe: row.variantNameHe,
      variantNameEn: row.variantNameEn,
      added: added.ok,
      problem: added.ok ? null : added.problem,
      changed: added.ok && delivered !== null && requestedG !== null && requestedG !== delivered ? { fromG: delivered, toG: requestedG } : null,
    });
  }

  if (lines.every((l) => !l.added)) return { ok: false, problem: { key: "NOTHING_TO_ADD", lines } };
  return { ok: true, count: await cartLineCount(cartId), lines };
}
