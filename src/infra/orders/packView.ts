import "server-only";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client";
import { customer, deliverySlot, invoice, order, orderLine, paymentCapture, paymentIntent, product, productVariant, staffUser } from "../db/schema";

export async function loadPackView(orderId: string) {
  if (!z.string().uuid().safeParse(orderId).success) return null;
  const [row] = await db
    .select({ order, firstName: customer.firstName, lastName: customer.lastName, startsAt: deliverySlot.startsAt, endsAt: deliverySlot.endsAt })
    .from(order)
    .innerJoin(customer, eq(customer.id, order.customerId))
    .leftJoin(deliverySlot, eq(deliverySlot.id, order.slotId))
    .where(eq(order.id, orderId));
  if (!row) return null;

  const lines = await db
    .select({ line: orderLine, animal: product.animal, image: product.image })
    .from(orderLine)
    .innerJoin(productVariant, eq(productVariant.id, orderLine.variantId))
    .innerJoin(product, eq(product.id, productVariant.productId))
    .where(eq(orderLine.orderId, orderId))
    .orderBy(asc(orderLine.sortOrder), asc(orderLine.id));

  const [intent] = await db.select().from(paymentIntent).where(and(eq(paymentIntent.orderId, orderId), eq(paymentIntent.status, "AUTHORIZED")));
  const captures = intent ? await db.select().from(paymentCapture).where(eq(paymentCapture.paymentIntentId, intent.id)).orderBy(desc(paymentCapture.createdAt)) : [];
  const [inv] = await db.select({ number: invoice.number }).from(invoice).where(eq(invoice.orderId, orderId));
  const managers = await db
    .select({ id: staffUser.id, nameHe: staffUser.fullNameHe, nameEn: staffUser.fullNameEn })
    .from(staffUser)
    .where(and(eq(staffUser.active, true), inArray(staffUser.role, ["OWNER", "MANAGER"])));

  const o = row.order;
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    version: o.version,
    customerName: `${row.firstName} ${row.lastName}`,
    slot: row.startsAt && row.endsAt ? { startsAt: row.startsAt.toISOString(), endsAt: row.endsAt.toISOString() } : null,
    deliveryFeeAgorot: o.deliveryFeeAgorot,
    authorizationCeilingAgorot: o.authorizationCeilingAgorot,
    finalTotalAgorot: o.finalTotalAgorot,
    capturedAgorot: o.capturedAgorot,
    extraChargedAgorot: o.extraChargedAgorot,
    captureAttempts: captures.length,
    lastCaptureFailure: captures.find((c) => c.status === "FAILED")?.failureReasonKey ?? null,
    invoiceNumber: inv?.number ?? null,
    approvalDeadlineAt: o.approvalDeadlineAt?.toISOString() ?? null,
    managers,
    lines: lines.map(({ line: l, animal, image }) => ({
      id: l.id,
      nameHe: l.productNameHe,
      nameEn: l.productNameEn,
      variantHe: l.variantNameHe,
      variantEn: l.variantNameEn,
      cutHe: l.cutInstructionHe,
      cutEn: l.cutInstructionEn,
      note: l.customerNote,
      animal,
      image,
      pricingMode: l.pricingMode,
      pricePerKgAgorot: l.pricePerKgAgorot,
      estimatedG: l.estimatedG,
      toleranceBp: l.toleranceBp,
      minG: l.toleranceMinG,
      maxG: l.toleranceMaxG,
      actualG: l.actualG,
      pendingActualG: l.pendingActualG,
      quantity: l.quantity,
      unitPriceAgorot: l.unitPriceAgorot,
      estimateAgorot: l.estimateAgorot,
      finalAgorot: l.finalAgorot,
      status: l.status,
      allowSubstitute: l.allowSubstitute,
      isSubstitute: Boolean(l.substitutionReasonKey),
      handlingFlags: l.handlingFlags,
      handlingConfirmed: Boolean(l.handlingConfirmedAt),
    })),
  };
}

export type PackView = NonNullable<Awaited<ReturnType<typeof loadPackView>>>;
export type PackLine = PackView["lines"][number];
