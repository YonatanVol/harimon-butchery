import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { can, type StaffRole } from "@/domain/auth/permissions";
import { agorot } from "@/domain/money/agorot";
import { formatAgorot } from "@/domain/money/format";
import { vatFromGross } from "@/domain/money/vat";
import { MAX_CAPTURE_ATTEMPTS } from "@/domain/order/machine";
import type { PaymentProvider } from "@/domain/payments/provider";
import { formatGrams, grams } from "@/domain/weight/grams";
import { priceForWeight } from "@/domain/weight/reprice";
import { classifyWeight, toleranceBounds } from "@/domain/weight/tolerance";
import type * as schema from "../db/schema";
import {
  auditEvent,
  deliverySlot,
  invoice,
  invoiceCounter,
  order,
  orderLine,
  paymentCapture,
  paymentIntent,
  paymentRefund,
  product,
  productVariant,
  stockItem,
  stockMovement,
} from "../db/schema";
import { checkStaffPin } from "../staff/pinCheck";
import { applyOrderEvent } from "./events";

type Database = NodePgDatabase<typeof schema>;
type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Staff = { id: string; role: string };

export type WeighingProblem =
  | { key: "NOT_PERMITTED" }
  | { key: "NOT_FOUND" }
  | { key: "CONFLICT" }
  | { key: "WRONG_STATE"; status: string }
  | { key: "INVALID_WEIGHT" }
  | { key: "OVER_TOLERANCE"; maxG: number; overByG: number }
  | { key: "UNDER_TOLERANCE"; minG: number; shortByG: number }
  | { key: "HANDLING_NOT_CONFIRMED"; productNameHe: string; productNameEn: string }
  | { key: "LINES_INCOMPLETE"; remaining: number }
  | { key: "NOTHING_TO_CHARGE" }
  | { key: "SUBSTITUTE_NOT_ALLOWED" }
  | { key: "SUBSTITUTE_TOO_EXPENSIVE" }
  | { key: "MANAGER_PIN_INVALID" }
  | { key: "MANAGER_PIN_LOCKED"; minutes: number }
  | { key: "CAPTURE_IN_PROGRESS" }
  | { key: "EXTRA_ALREADY_CHARGED" }
  | { key: "EXTRA_EXCEEDS_FINAL" }
  | { key: "TOO_MANY_CAPTURE_ATTEMPTS" }
  | { key: "CAPTURE_FAILED"; reason: string }
  | { key: "AWAITING_CUSTOMER" }
  | { key: "ALREADY_ASKING" };

export type WeighingResult<T = object> = ({ ok: true } & T) | { ok: false; problem: WeighingProblem };

class Stop extends Error {
  constructor(public problem: WeighingProblem) {
    super(problem.key);
  }
}

const EDITABLE = ["PICKING", "AWAITING_CUSTOMER_APPROVAL"] as const;

async function lockOrder(tx: Tx, orderId: string, expectedVersion?: number) {
  const [o] = await tx.select().from(order).where(eq(order.id, orderId)).for("update");
  if (!o) throw new Stop({ key: "NOT_FOUND" });
  if (expectedVersion !== undefined && o.version !== expectedVersion) throw new Stop({ key: "CONFLICT" });
  return o;
}

async function bumpVersion(tx: Tx, orderId: string) {
  const [o] = await tx
    .update(order)
    .set({ version: sql`${order.version} + 1`, updatedAt: new Date() })
    .where(eq(order.id, orderId))
    .returning({ version: order.version });
  return o.version;
}

/**
 * A line the customer already paid extra for: weighed above the range and priced at its full actual weight
 * (a free extra is priced at the top of the range instead). Changing it could leave the final total below
 * what was already charged, so it stays as approved.
 */
function approvedExtra(line: typeof orderLine.$inferSelect) {
  if (line.pricingMode !== "WEIGHT" || line.status !== "WEIGHED" || !line.actualG || !line.toleranceMaxG || line.actualG <= line.toleranceMaxG) return false;
  return line.finalAgorot === priceForWeight(agorot(line.pricePerKgAgorot!), grams(line.actualG));
}

/** Every change on the weighing screen goes in the activity log: who weighed, undid, shorted or substituted what. */
async function auditLine(tx: Tx, staff: Staff, line: typeof orderLine.$inferSelect, action: string, after: Record<string, unknown>) {
  await tx.insert(auditEvent).values({
    actorType: "STAFF",
    actorId: staff.id,
    entityType: "order_line",
    entityId: line.id,
    action,
    before: { status: line.status, actualG: line.actualG, actualQuantity: line.actualQuantity, finalAgorot: line.finalAgorot },
    after,
  });
}

/** Order-level steps on the weighing screen, for the activity log. */
async function auditOrder(exec: Database | Tx, staff: Staff, orderId: string, action: string, after: Record<string, unknown> = {}) {
  await exec.insert(auditEvent).values({ actorType: "STAFF", actorId: staff.id, entityType: "order", entityId: orderId, action, after });
}

function requireFloor(staff: Staff) {
  if (!can(staff.role as StaffRole, "PICK_AND_WEIGH")) throw new Stop({ key: "NOT_PERMITTED" });
}

async function run<T extends object>(fn: () => Promise<T>): Promise<WeighingResult<T>> {
  try {
    const value = await fn();
    return { ok: true, ...value };
  } catch (e) {
    if (e instanceof Stop) return { ok: false, problem: e.problem };
    throw e;
  }
}

export function startPicking(db: Database, { orderId, staff, appUrl }: { orderId: string; staff: Staff; appUrl: string }) {
  return run(() =>
    db.transaction(async (tx) => {
      requireFloor(staff);
      const o = await lockOrder(tx, orderId);
      if (o.status === "PICKING") return { version: o.version };
      // A hold that has lapsed can't be charged: stop before any meat is cut, and ask the customer to pay again.
      if (o.status === "AUTHORIZED") {
        const [hold] = await tx.select().from(paymentIntent).where(and(eq(paymentIntent.orderId, orderId), eq(paymentIntent.status, "AUTHORIZED"), eq(paymentIntent.purpose, "AUTHORIZE")));
        if (hold?.expiresAt && hold.expiresAt <= new Date()) {
          const expired = await applyOrderEvent(tx, { orderId, event: "HOLD_EXPIRED", ctx: { actor: "SYSTEM" }, appUrl });
          if (expired.ok) return { version: expired.order.version, holdExpired: true as const };
        }
      }
      const moved = await applyOrderEvent(tx, { orderId, event: "PICKING_STARTED", ctx: { actor: staff.role as StaffRole }, actorId: staff.id, appUrl });
      if (!moved.ok) throw new Stop({ key: "WRONG_STATE", status: o.status });
      await tx.update(order).set({ assignedButcherId: staff.id }).where(eq(order.id, orderId));
      await auditOrder(tx, staff, orderId, "order.start_picking");
      return { version: moved.order.version };
    }),
  );
}

export interface RecordWeightInput {
  orderId: string;
  lineId: string;
  actualG: number;
  expectedVersion: number;
  staff: Staff;
  /** The butcher confirmed a piece lighter than the range: the customer gets less and pays less. */
  confirmUnder?: boolean;
  /** Over the range, a manager may let the customer have the extra for free. */
  giveExtraFree?: { managerId: string; pin: string };
}

export async function recordWeight(db: Database, input: RecordWeightInput): Promise<WeighingResult<{ version: number }>> {
  // The manager's PIN is checked first, outside the weighing transaction, so a wrong guess is counted even
  // though nothing is written — the same 5-try lock as signing in, not an open door to all 10,000 PINs.
  if (input.giveExtraFree) {
    const checked = await checkStaffPin(db, input.giveExtraFree.managerId, input.giveExtraFree.pin);
    if (!checked.ok || !can(checked.member.role as StaffRole, "OVERRIDE")) {
      return { ok: false, problem: checked.ok || checked.problem.key !== "LOCKED" ? { key: "MANAGER_PIN_INVALID" } : { key: "MANAGER_PIN_LOCKED", minutes: checked.problem.minutes } };
    }
  }
  return run(() =>
    db.transaction(async (tx) => {
      requireFloor(input.staff);
      if (!Number.isSafeInteger(input.actualG) || input.actualG <= 0 || input.actualG > 50_000) throw new Stop({ key: "INVALID_WEIGHT" });
      const o = await lockOrder(tx, input.orderId, input.expectedVersion);
      if (!EDITABLE.includes(o.status as (typeof EDITABLE)[number])) throw new Stop({ key: "WRONG_STATE", status: o.status });
      const [line] = await tx.select().from(orderLine).where(and(eq(orderLine.id, input.lineId), eq(orderLine.orderId, o.id)));
      if (!line || line.pricingMode !== "WEIGHT" || !["PENDING", "WEIGHED"].includes(line.status)) throw new Stop({ key: "NOT_FOUND" });
      if (line.pendingActualG) throw new Stop({ key: "AWAITING_CUSTOMER" });
      if (approvedExtra(line)) throw new Stop({ key: "EXTRA_ALREADY_CHARGED" });

      const bounds = toleranceBounds(grams(line.estimatedG!), line.toleranceBp!);
      const status = classifyWeight(grams(input.actualG), bounds);
      const price = agorot(line.pricePerKgAgorot!);
      let finalAgorot = priceForWeight(price, grams(input.actualG));
      let goodwill = 0;

      if (status.kind === "under" && !input.confirmUnder) throw new Stop({ key: "UNDER_TOLERANCE", minG: bounds.min, shortByG: status.shortBy });
      if (status.kind === "over") {
        if (!input.giveExtraFree) throw new Stop({ key: "OVER_TOLERANCE", maxG: bounds.max, overByG: status.overBy });
        const manager = { id: input.giveExtraFree.managerId };
        // Charge the ceiling; the shop absorbs the rest — and records exactly what it cost.
        const ceiling = priceForWeight(price, bounds.max);
        goodwill = finalAgorot - ceiling;
        finalAgorot = ceiling;
        await tx.insert(auditEvent).values({
          actorType: "STAFF",
          actorId: manager.id,
          entityType: "order_line",
          entityId: line.id,
          action: "GIVE_EXTRA_FREE",
          before: { estimatedG: line.estimatedG, maxG: bounds.max },
          after: { actualG: input.actualG, chargedAgorot: finalAgorot, goodwillAgorot: goodwill },
          reason: "Over tolerance, extra given free",
        });
      }

      const previousGoodwill = line.status === "WEIGHED" && line.actualG && line.actualG > bounds.max ? priceForWeight(price, grams(line.actualG)) - priceForWeight(price, bounds.max) : 0;
      await tx
        .update(orderLine)
        .set({ actualG: input.actualG, finalAgorot, status: "WEIGHED", weighedByStaffId: input.staff.id, weighedAt: new Date(), weighingSource: "MANUAL" })
        .where(eq(orderLine.id, line.id));
      if (goodwill !== previousGoodwill) {
        await tx.update(order).set({ goodwillAgorot: sql`${order.goodwillAgorot} + ${goodwill - previousGoodwill}` }).where(eq(order.id, o.id));
      }
      await auditLine(tx, input.staff, line, "line.weigh", { actualG: input.actualG, finalAgorot, status: status.kind });
      const version = await bumpVersion(tx, o.id);
      return { version, finalAgorot, status: status.kind };
    }),
  );
}

/** Over the range: ask the customer whether to keep the extra (separate charge) or trim. */
export function askCustomer(
  db: Database,
  input: { orderId: string; lineId: string; actualG: number; expectedVersion: number; staff: Staff; appUrl: string; locale: "he" | "en"; now?: Date },
) {
  const now = input.now ?? new Date();
  return run(() =>
    db.transaction(async (tx) => {
      requireFloor(input.staff);
      const o = await lockOrder(tx, input.orderId, input.expectedVersion);
      if (o.status === "AWAITING_CUSTOMER_APPROVAL") throw new Stop({ key: "ALREADY_ASKING" });
      if (o.status !== "PICKING") throw new Stop({ key: "WRONG_STATE", status: o.status });
      if (!Number.isSafeInteger(input.actualG) || input.actualG <= 0 || input.actualG > 50_000) throw new Stop({ key: "INVALID_WEIGHT" });
      const [line] = await tx.select().from(orderLine).where(and(eq(orderLine.id, input.lineId), eq(orderLine.orderId, o.id)));
      if (!line || line.pricingMode !== "WEIGHT" || !["PENDING", "WEIGHED"].includes(line.status)) throw new Stop({ key: "NOT_FOUND" });
      if (approvedExtra(line)) throw new Stop({ key: "EXTRA_ALREADY_CHARGED" });
      const bounds = toleranceBounds(grams(line.estimatedG!), line.toleranceBp!);
      if (classifyWeight(grams(input.actualG), bounds).kind !== "over") throw new Stop({ key: "INVALID_WEIGHT" });

      const price = agorot(line.pricePerKgAgorot!);
      const extra = priceForWeight(price, grams(input.actualG)) - priceForWeight(price, bounds.max);
      const [slot] = o.slotId ? await tx.select().from(deliverySlot).where(eq(deliverySlot.id, o.slotId)) : [];
      // Two hours to answer, but always an hour before the delivery window, and never less than 15 minutes.
      const latest = slot ? slot.startsAt.getTime() - 60 * 60_000 : now.getTime() + 2 * 3_600_000;
      const deadline = new Date(Math.max(now.getTime() + 15 * 60_000, Math.min(now.getTime() + 2 * 3_600_000, latest)));

      await tx.update(orderLine).set({ pendingActualG: input.actualG }).where(eq(orderLine.id, line.id));
      await tx.update(order).set({ approvalDeadlineAt: deadline }).where(eq(order.id, o.id));
      const fmt = (g: number) => formatGrams(grams(g), input.locale);
      const moved = await applyOrderEvent(tx, {
        orderId: o.id,
        event: "OVER_TOLERANCE_ASKED",
        ctx: { actor: input.staff.role as StaffRole },
        actorId: input.staff.id,
        appUrl: input.appUrl,
        now,
        payload: {
          lineId: line.id,
          actualG: input.actualG,
          templateVars: {
            productName: input.locale === "he" ? line.productNameHe : line.productNameEn,
            actualWeight: fmt(input.actualG),
            requestedWeight: fmt(line.estimatedG!),
            trimmedWeight: fmt(bounds.max),
            extraAmount: formatAgorot(agorot(extra), input.locale),
            deadline: new Intl.DateTimeFormat(input.locale === "he" ? "he-IL" : "en-IL", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Asia/Jerusalem" }).format(deadline),
          },
        },
      });
      if (!moved.ok) throw new Stop({ key: "WRONG_STATE", status: o.status });
      await auditOrder(tx, input.staff, o.id, "order.ask_customer", { lineId: line.id, actualG: input.actualG, extraAgorot: extra });
      return { version: moved.order.version, extraAgorot: extra, deadline: deadline.toISOString() };
    }),
  );
}

export function undoLine(db: Database, { orderId, lineId, expectedVersion, staff }: { orderId: string; lineId: string; expectedVersion: number; staff: Staff }) {
  return run(() =>
    db.transaction(async (tx) => {
      requireFloor(staff);
      const o = await lockOrder(tx, orderId, expectedVersion);
      if (!EDITABLE.includes(o.status as (typeof EDITABLE)[number])) throw new Stop({ key: "WRONG_STATE", status: o.status });
      const [line] = await tx.select().from(orderLine).where(and(eq(orderLine.id, lineId), eq(orderLine.orderId, orderId)));
      if (!line || line.status === "SUBSTITUTED") throw new Stop({ key: "NOT_FOUND" });
      if (line.pendingActualG) throw new Stop({ key: "AWAITING_CUSTOMER" });
      if (approvedExtra(line)) throw new Stop({ key: "EXTRA_ALREADY_CHARGED" });
      // Only a line given free carries goodwill to take back; its final price sits at the top of the range.
      if (line.actualG && line.estimatedG && line.toleranceMaxG && line.actualG > line.toleranceMaxG) {
        const price = agorot(line.pricePerKgAgorot!);
        const given = priceForWeight(price, grams(line.actualG)) - priceForWeight(price, grams(line.toleranceMaxG));
        await tx.update(order).set({ goodwillAgorot: sql`greatest(${order.goodwillAgorot} - ${given}, 0)` }).where(eq(order.id, orderId));
      }
      await tx
        .update(orderLine)
        .set({ actualG: null, actualQuantity: null, finalAgorot: null, status: "PENDING", weighedAt: null, weighedByStaffId: null })
        .where(eq(orderLine.id, lineId));
      await auditLine(tx, staff, line, "line.undo", { status: "PENDING" });
      return { version: await bumpVersion(tx, orderId) };
    }),
  );
}

export function confirmPackageLine(db: Database, { orderId, lineId, expectedVersion, staff }: { orderId: string; lineId: string; expectedVersion: number; staff: Staff }) {
  return run(() =>
    db.transaction(async (tx) => {
      requireFloor(staff);
      const o = await lockOrder(tx, orderId, expectedVersion);
      if (!EDITABLE.includes(o.status as (typeof EDITABLE)[number])) throw new Stop({ key: "WRONG_STATE", status: o.status });
      const [line] = await tx.select().from(orderLine).where(and(eq(orderLine.id, lineId), eq(orderLine.orderId, orderId)));
      if (!line || line.pricingMode !== "PACKAGE") throw new Stop({ key: "NOT_FOUND" });
      await tx
        .update(orderLine)
        .set({ actualQuantity: line.quantity, finalAgorot: line.estimateAgorot, status: "WEIGHED", weighedByStaffId: staff.id, weighedAt: new Date() })
        .where(eq(orderLine.id, lineId));
      await auditLine(tx, staff, line, "line.package", { actualQuantity: line.quantity });
      return { version: await bumpVersion(tx, orderId) };
    }),
  );
}

export function markShort(db: Database, { orderId, lineId, expectedVersion, staff }: { orderId: string; lineId: string; expectedVersion: number; staff: Staff }) {
  return run(() =>
    db.transaction(async (tx) => {
      requireFloor(staff);
      const o = await lockOrder(tx, orderId, expectedVersion);
      if (!EDITABLE.includes(o.status as (typeof EDITABLE)[number])) throw new Stop({ key: "WRONG_STATE", status: o.status });
      const [line] = await tx.select().from(orderLine).where(and(eq(orderLine.id, lineId), eq(orderLine.orderId, orderId)));
      if (!line || !["PENDING", "WEIGHED"].includes(line.status)) throw new Stop({ key: "NOT_FOUND" });
      if (line.pendingActualG) throw new Stop({ key: "AWAITING_CUSTOMER" });
      if (approvedExtra(line)) throw new Stop({ key: "EXTRA_ALREADY_CHARGED" });
      await tx
        .update(orderLine)
        .set({ status: "SHORT", actualG: null, actualQuantity: 0, finalAgorot: 0, weighedByStaffId: staff.id, weighedAt: new Date() })
        .where(eq(orderLine.id, lineId));
      await tx.update(order).set({ partiallyFulfilled: true }).where(eq(order.id, orderId));
      await auditLine(tx, staff, line, "line.short", { status: "SHORT" });
      return { version: await bumpVersion(tx, orderId) };
    }),
  );
}

export async function substituteCandidates(db: Database, lineId: string) {
  const [line] = await db
    .select({ line: orderLine, categoryId: product.categoryId, productId: product.id })
    .from(orderLine)
    .innerJoin(productVariant, eq(productVariant.id, orderLine.variantId))
    .innerJoin(product, eq(product.id, productVariant.productId))
    .where(eq(orderLine.id, lineId));
  if (!line || line.line.pricingMode !== "WEIGHT") return [];
  const rows = await db
    .select({ variant: productVariant, product, stock: stockItem })
    .from(productVariant)
    .innerJoin(product, eq(product.id, productVariant.productId))
    .innerJoin(stockItem, eq(stockItem.productId, product.id))
    .where(
      and(
        eq(product.categoryId, line.categoryId),
        ne(product.id, line.productId),
        eq(product.pricingMode, "WEIGHT"),
        eq(product.published, true),
        eq(productVariant.isDefault, true),
        sql`${stockItem.onHandG} - ${stockItem.reservedG} >= ${line.line.estimatedG}`,
      ),
    );
  const ceiling = line.line.ceilingAgorot;
  return rows
    .map((r) => {
      const perKg = r.product.pricePerKgAgorot! + r.variant.priceDeltaAgorot;
      const maxG = toleranceBounds(grams(line.line.estimatedG!), line.line.toleranceBp!).max;
      const newCeiling = priceForWeight(agorot(perKg), maxG);
      return {
        variantId: r.variant.id,
        nameHe: r.product.nameHe,
        nameEn: r.product.nameEn,
        pricePerKgAgorot: perKg,
        deltaPerKgAgorot: perKg - line.line.pricePerKgAgorot!,
        fitsHold: newCeiling <= ceiling,
      };
    })
    .sort((a, b) => Math.abs(a.deltaPerKgAgorot) - Math.abs(b.deltaPerKgAgorot))
    .slice(0, 3);
}

export function substituteLine(
  db: Database,
  { orderId, lineId, variantId, expectedVersion, staff }: { orderId: string; lineId: string; variantId: string; expectedVersion: number; staff: Staff },
) {
  return run(() =>
    db.transaction(async (tx) => {
      requireFloor(staff);
      const o = await lockOrder(tx, orderId, expectedVersion);
      if (!EDITABLE.includes(o.status as (typeof EDITABLE)[number])) throw new Stop({ key: "WRONG_STATE", status: o.status });
      const [line] = await tx.select().from(orderLine).where(and(eq(orderLine.id, lineId), eq(orderLine.orderId, orderId)));
      if (!line || line.pricingMode !== "WEIGHT" || !["PENDING", "WEIGHED"].includes(line.status)) throw new Stop({ key: "NOT_FOUND" });
      if (line.pendingActualG) throw new Stop({ key: "AWAITING_CUSTOMER" });
      if (approvedExtra(line)) throw new Stop({ key: "EXTRA_ALREADY_CHARGED" });
      if (!line.allowSubstitute) throw new Stop({ key: "SUBSTITUTE_NOT_ALLOWED" });
      const [sub] = await tx
        .select({ variant: productVariant, product })
        .from(productVariant)
        .innerJoin(product, eq(product.id, productVariant.productId))
        .where(eq(productVariant.id, variantId));
      if (!sub || sub.product.pricingMode !== "WEIGHT") throw new Stop({ key: "NOT_FOUND" });

      const perKg = agorot(sub.product.pricePerKgAgorot! + sub.variant.priceDeltaAgorot);
      const bounds = toleranceBounds(grams(line.estimatedG!), line.toleranceBp!);
      const newCeiling = priceForWeight(perKg, bounds.max);
      // The substitute must fit inside what this line was allowed to cost, or the hold could be exceeded.
      if (newCeiling > line.ceilingAgorot) throw new Stop({ key: "SUBSTITUTE_TOO_EXPENSIVE" });

      await tx
        .update(orderLine)
        .set({ status: "SUBSTITUTED", substitutedWithVariantId: variantId, finalAgorot: 0, actualG: null, weighedByStaffId: staff.id, weighedAt: new Date() })
        .where(eq(orderLine.id, lineId));
      await tx.insert(orderLine).values({
        orderId,
        variantId,
        productNameHe: sub.product.nameHe,
        productNameEn: sub.product.nameEn,
        variantNameHe: sub.variant.nameHe,
        variantNameEn: sub.variant.nameEn,
        pricingMode: "WEIGHT",
        pricePerKgAgorot: perKg,
        estimatedG: line.estimatedG,
        toleranceBp: line.toleranceBp,
        toleranceMinG: bounds.min,
        toleranceMaxG: bounds.max,
        estimateAgorot: priceForWeight(perKg, grams(line.estimatedG!)),
        ceilingAgorot: newCeiling,
        allowSubstitute: false,
        cutInstructionHe: line.cutInstructionHe,
        cutInstructionEn: line.cutInstructionEn,
        customerNote: line.customerNote,
        handlingFlags: sub.product.handlingFlags,
        substitutionReasonKey: "OUT_OF_STOCK",
        sortOrder: line.sortOrder,
      });
      await tx.update(order).set({ partiallyFulfilled: true }).where(eq(order.id, orderId));
      await auditLine(tx, staff, line, "line.substitute", { substituteNameHe: sub.product.nameHe, substituteNameEn: sub.product.nameEn, pricePerKgAgorot: perKg });
      return { version: await bumpVersion(tx, orderId) };
    }),
  );
}

export function confirmHandling(db: Database, { orderId, lineId, expectedVersion, staff }: { orderId: string; lineId: string; expectedVersion: number; staff: Staff }) {
  return run(() =>
    db.transaction(async (tx) => {
      requireFloor(staff);
      const o = await lockOrder(tx, orderId, expectedVersion);
      if (!EDITABLE.includes(o.status as (typeof EDITABLE)[number])) throw new Stop({ key: "WRONG_STATE", status: o.status });
      const [line] = await tx
        .update(orderLine)
        .set({ handlingConfirmedAt: new Date() })
        .where(and(eq(orderLine.id, lineId), eq(orderLine.orderId, orderId)))
        .returning();
      if (!line) throw new Stop({ key: "NOT_FOUND" });
      await auditLine(tx, staff, line, "line.handling", { handlingFlags: line.handlingFlags });
      return { version: await bumpVersion(tx, orderId) };
    }),
  );
}

export type FinishResult = WeighingResult<{ finalTotalAgorot: number; capturedAgorot: number; invoiceNumber: string | null }>;

/**
 * All lines are done: commit stock, compute the real total, and charge it — never more than the hold.
 * If the charge fails the order stops in CAPTURE_FAILED with the reason; it is never silently dispatched.
 */
export async function finishWeighing(
  db: Database,
  provider: PaymentProvider,
  { orderId, expectedVersion, staff, appUrl, now = new Date() }: { orderId: string; expectedVersion: number; staff: Staff; appUrl: string; now?: Date },
): Promise<FinishResult> {
  if (!can(staff.role as StaffRole, "CAPTURE_PAYMENT")) return { ok: false, problem: { key: "NOT_PERMITTED" } };

  let prepared: { intentId: string; transactionRef: string; purpose: string; charged: number; finalTotal: number; onHold: number; attempt: number };
  try {
    prepared = await db.transaction(async (tx) => {
      const o = await lockOrder(tx, orderId, expectedVersion);
      if (o.status !== "PICKING") throw new Stop({ key: "WRONG_STATE", status: o.status });
      const lines = await tx
        .select({ line: orderLine, productId: productVariant.productId })
        .from(orderLine)
        .innerJoin(productVariant, eq(productVariant.id, orderLine.variantId))
        .where(eq(orderLine.orderId, orderId))
        .orderBy(asc(orderLine.sortOrder));
      const remaining = lines.filter(({ line: l }) => !["WEIGHED", "SHORT", "SUBSTITUTED", "CANCELLED"].includes(l.status)).length;
      if (remaining > 0) throw new Stop({ key: "LINES_INCOMPLETE", remaining });
      const unhandled = lines.find(
        ({ line: l }) => l.status === "WEIGHED" && (l.handlingFlags.includes("REQUIRES_BROILING_TZLIYA") || l.handlingFlags.includes("REQUIRES_SALTING")) && !l.handlingConfirmedAt,
      )?.line;
      if (unhandled) throw new Stop({ key: "HANDLING_NOT_CONFIRMED", productNameHe: unhandled.productNameHe, productNameEn: unhandled.productNameEn });

      const itemsFinal = lines.reduce((sum, { line: l }) => sum + (l.finalAgorot ?? 0), 0);
      if (itemsFinal === 0) throw new Stop({ key: "NOTHING_TO_CHARGE" });
      const finalTotal = itemsFinal + o.deliveryFeeAgorot;

      // Stock: the weighed meat leaves the shop; the reservation made at checkout is released.
      // Substitute lines were added during picking and never reserved anything.
      for (const { line: l, productId } of lines) {
        const reservedG = l.substitutionReasonKey ? 0 : (l.estimatedG ?? 0);
        const reservedUnits = l.substitutionReasonKey ? 0 : (l.quantity ?? 0);
        const pickedG = l.status === "WEIGHED" ? (l.actualG ?? 0) : 0;
        const pickedUnits = l.status === "WEIGHED" ? (l.actualQuantity ?? 0) : 0;
        await tx
          .update(stockItem)
          .set({
            onHandG: sql`greatest(${stockItem.onHandG} - ${pickedG}, 0)`,
            reservedG: sql`greatest(${stockItem.reservedG} - ${reservedG}, 0)`,
            onHandUnits: sql`greatest(${stockItem.onHandUnits} - ${pickedUnits}, 0)`,
            reservedUnits: sql`greatest(${stockItem.reservedUnits} - ${reservedUnits}, 0)`,
          })
          .where(eq(stockItem.productId, productId));
        if (pickedG || pickedUnits) {
          await tx.insert(stockMovement).values({ productId, deltaG: -pickedG, deltaUnits: -pickedUnits, reason: "PICKED", orderId, staffId: staff.id });
        }
      }

      await tx.update(order).set({ itemsFinalAgorot: itemsFinal, finalTotalAgorot: finalTotal }).where(eq(order.id, orderId));
      // Extra weight the customer approved was already charged on its own; the hold covers the rest.
      const onHold = finalTotal - o.extraChargedAgorot;
      // Unreachable while approved lines are locked above; never let a negative charge reach the provider.
      if (onHold < 0) throw new Stop({ key: "EXTRA_EXCEEDS_FINAL" });
      for (const [event] of [["LINES_COMPLETED"], ["REPRICED"]] as const) {
        const moved = await applyOrderEvent(tx, { orderId, event, ctx: { actor: staff.role as StaffRole }, actorId: staff.id, appUrl, now });
        if (!moved.ok) throw new Stop({ key: "WRONG_STATE", status: event });
      }
      const requested = await applyOrderEvent(tx, {
        orderId,
        event: "CAPTURE_REQUESTED",
        ctx: { actor: staff.role as StaffRole, finalTotalAgorot: finalTotal, authorizationCeilingAgorot: o.authorizationCeilingAgorot },
        actorId: staff.id,
        appUrl,
        now,
      });
      if (!requested.ok) {
        throw new Stop(requested.reason === "FINAL_EXCEEDS_HOLD" ? { key: "CAPTURE_FAILED", reason: "FINAL_EXCEEDS_HOLD" } : { key: "WRONG_STATE", status: requested.reason });
      }

      const [intent] = await tx
        .select()
        .from(paymentIntent)
        .where(and(eq(paymentIntent.orderId, orderId), eq(paymentIntent.status, "AUTHORIZED"), ne(paymentIntent.purpose, "EXTRA")));
      const [{ attempts }] = await tx
        .select({ attempts: sql<number>`count(*)::int` })
        .from(paymentCapture)
        .where(eq(paymentCapture.paymentIntentId, intent.id));
      await tx.insert(paymentCapture).values({
        paymentIntentId: intent.id,
        amountAgorot: onHold,
        attempt: attempts + 1,
        idempotencyKey: `order:${orderId}:capture:${attempts + 1}`,
        status: "PENDING",
      });
      return {
        intentId: intent.id,
        transactionRef: intent.providerTransactionRef!,
        purpose: intent.purpose,
        charged: intent.amountAgorot,
        finalTotal,
        onHold,
        attempt: attempts + 1,
      };
    });
  } catch (e) {
    if (e instanceof Stop) return { ok: false, problem: e.problem };
    throw e;
  }

  return settleCapture(db, provider, { orderId, staff, appUrl, now, ...prepared });
}

async function settleCapture(
  db: Database,
  provider: PaymentProvider,
  p: { orderId: string; staff: Staff; appUrl: string; now: Date; intentId: string; transactionRef: string; purpose: string; charged: number; finalTotal: number; onHold: number; attempt: number },
): Promise<FinishResult> {
  const idempotencyKey = `order:${p.orderId}:capture:${p.attempt}`;
  let outcome: { ok: true; ref: string } | { ok: false; code: string; reason: string };

  if (p.purpose === "CHARGE") {
    // Already charged in full at checkout: settle by refunding whatever was not supplied.
    const difference = p.charged - p.onHold;
    if (difference > 0) {
      // One key per order, not per attempt: a retry after a timeout must not refund the difference twice.
      const refundKey = `order:${p.orderId}:settle-refund`;
      const r = await provider.refund({ transactionRef: p.transactionRef, amountAgorot: difference, idempotencyKey: refundKey });
      // The money stays on the original charge: later refunds go against that transaction, never against this refund.
      outcome = r.ok ? { ok: true, ref: p.transactionRef } : { ok: false, code: r.code, reason: "PROVIDER_ERROR" };
      if (r.ok) {
        await db
          .insert(paymentRefund)
          .values({ paymentIntentId: p.intentId, amountAgorot: difference, reasonKey: "NOT_SUPPLIED", requestedByStaffId: p.staff.id, status: "SUCCEEDED", idempotencyKey: refundKey, providerRefundRef: r.refundRef })
          .onConflictDoNothing({ target: paymentRefund.idempotencyKey });
      }
    } else {
      outcome = { ok: true, ref: p.transactionRef };
    }
  } else {
    const r = await provider.capture({ transactionRef: p.transactionRef, amountAgorot: p.onHold, idempotencyKey });
    outcome = r.ok ? { ok: true, ref: r.captureRef } : { ok: false, code: r.code, reason: r.reason };
  }

  return db.transaction(async (tx): Promise<FinishResult> => {
    if (!outcome.ok) {
      await tx
        .update(paymentCapture)
        .set({ status: "FAILED", failureCode: outcome.code, failureReasonKey: outcome.reason })
        .where(eq(paymentCapture.idempotencyKey, idempotencyKey));
      await applyOrderEvent(tx, { orderId: p.orderId, event: "CAPTURE_FAILED", ctx: { actor: "PSP" }, reasonKey: outcome.reason, appUrl: p.appUrl, now: p.now });
      return { ok: false, problem: { key: "CAPTURE_FAILED", reason: outcome.reason } };
    }

    await tx
      .update(paymentCapture)
      .set({ status: "SUCCEEDED", providerCaptureRef: outcome.ref, settledAt: p.now })
      .where(eq(paymentCapture.idempotencyKey, idempotencyKey));
    await tx.update(order).set({ capturedAgorot: p.finalTotal }).where(eq(order.id, p.orderId));

    const year = p.now.getUTCFullYear();
    const [counter] = await tx
      .insert(invoiceCounter)
      .values({ year, lastSequence: 1 })
      .onConflictDoUpdate({ target: invoiceCounter.year, set: { lastSequence: sql`${invoiceCounter.lastSequence} + 1` } })
      .returning();
    const [o] = await tx.select().from(order).where(eq(order.id, p.orderId));
    const lines = await tx
      .select()
      .from(orderLine)
      .where(and(eq(orderLine.orderId, p.orderId), inArray(orderLine.status, ["WEIGHED"])));
    const split = vatFromGross(agorot(p.finalTotal), o.vatRateBp);
    const number = `INV-${year}-${String(counter.lastSequence).padStart(6, "0")}`;
    await tx
      .insert(invoice)
      .values({
        orderId: p.orderId,
        year,
        sequence: counter.lastSequence,
        number,
        grossAgorot: split.gross,
        vatAgorot: split.vat,
        netAgorot: split.net,
        vatRateBp: o.vatRateBp,
        lines: lines.map((l) => ({ nameHe: l.productNameHe, nameEn: l.productNameEn, actualG: l.actualG, quantity: l.actualQuantity, amountAgorot: l.finalAgorot })),
      })
      .onConflictDoNothing();

    const moved = await applyOrderEvent(tx, { orderId: p.orderId, event: "CAPTURE_SUCCEEDED", ctx: { actor: "PSP" }, appUrl: p.appUrl, now: p.now });
    if (!moved.ok) throw new Error(`CAPTURE_SUCCEEDED rejected: ${moved.reason}`);
    await auditOrder(tx, p.staff, p.orderId, "capture.succeeded", { amountAgorot: p.onHold, attempt: p.attempt, finalTotalAgorot: p.finalTotal });
    return { ok: true, finalTotalAgorot: p.finalTotal, capturedAgorot: p.finalTotal, invoiceNumber: number };
  });
}

export async function retryCapture(
  db: Database,
  provider: PaymentProvider,
  { orderId, staff, appUrl, now = new Date() }: { orderId: string; staff: Staff; appUrl: string; now?: Date },
): Promise<FinishResult> {
  if (!can(staff.role as StaffRole, "CAPTURE_PAYMENT")) return { ok: false, problem: { key: "NOT_PERMITTED" } };
  let prepared: { intentId: string; transactionRef: string; purpose: string; charged: number; finalTotal: number; onHold: number; attempt: number };
  try {
    prepared = await db.transaction(async (tx) => {
      const o = await lockOrder(tx, orderId);
      const [intent] = await tx
        .select()
        .from(paymentIntent)
        .where(and(eq(paymentIntent.orderId, orderId), eq(paymentIntent.status, "AUTHORIZED"), ne(paymentIntent.purpose, "EXTRA")));
      const [{ attempts }] = await tx.select({ attempts: sql<number>`count(*)::int` }).from(paymentCapture).where(eq(paymentCapture.paymentIntentId, intent.id));
      const moved = await applyOrderEvent(tx, { orderId, event: "CAPTURE_RETRIED", ctx: { actor: staff.role as StaffRole, captureAttempts: attempts }, actorId: staff.id, appUrl, now });
      await auditOrder(tx, staff, orderId, "capture.retry", { attempt: attempts + 1 });
      if (!moved.ok) throw new Stop(moved.reason === "TOO_MANY_CAPTURE_ATTEMPTS" ? { key: "TOO_MANY_CAPTURE_ATTEMPTS" } : { key: "WRONG_STATE", status: o.status });
      const onHold = o.finalTotalAgorot! - o.extraChargedAgorot;
      await tx.insert(paymentCapture).values({
        paymentIntentId: intent.id,
        amountAgorot: onHold,
        attempt: attempts + 1,
        idempotencyKey: `order:${orderId}:capture:${attempts + 1}`,
        status: "PENDING",
      });
      return { intentId: intent.id, transactionRef: intent.providerTransactionRef!, purpose: intent.purpose, charged: intent.amountAgorot, finalTotal: o.finalTotalAgorot!, onHold, attempt: attempts + 1 };
    });
  } catch (e) {
    if (e instanceof Stop) return { ok: false, problem: e.problem };
    throw e;
  }
  return settleCapture(db, provider, { orderId, staff, appUrl, now, ...prepared });
}

/** How long a charge may sit in "charging" before staff can check it again. */
export const CAPTURE_STUCK_AFTER_MS = 2 * 60_000;

/**
 * A charge that never finished (the server stopped, or recording it failed after the provider answered):
 * run the same capture attempt again. Captures are idempotent per hold, so this finds the earlier charge
 * or makes it once, then records the outcome — the order can't stay in "charging" forever.
 */
export async function reconcileCapture(
  db: Database,
  provider: PaymentProvider,
  { orderId, staff, appUrl, now = new Date() }: { orderId: string; staff: Staff; appUrl: string; now?: Date },
): Promise<FinishResult> {
  if (!can(staff.role as StaffRole, "CAPTURE_PAYMENT")) return { ok: false, problem: { key: "NOT_PERMITTED" } };
  const [o] = await db.select().from(order).where(eq(order.id, orderId));
  if (!o) return { ok: false, problem: { key: "NOT_FOUND" } };
  if (o.status !== "CAPTURE_PENDING") return { ok: false, problem: { key: "WRONG_STATE", status: o.status } };
  const [intent] = await db
    .select()
    .from(paymentIntent)
    .where(and(eq(paymentIntent.orderId, orderId), eq(paymentIntent.status, "AUTHORIZED"), ne(paymentIntent.purpose, "EXTRA")));
  if (!intent?.providerTransactionRef) return { ok: false, problem: { key: "NOT_FOUND" } };
  const [latest] = await db.select().from(paymentCapture).where(eq(paymentCapture.paymentIntentId, intent.id)).orderBy(desc(paymentCapture.attempt)).limit(1);
  if (!latest || latest.status !== "PENDING") return { ok: false, problem: { key: "WRONG_STATE", status: o.status } };
  if (now.getTime() - latest.createdAt.getTime() < CAPTURE_STUCK_AFTER_MS) return { ok: false, problem: { key: "CAPTURE_IN_PROGRESS" } };
  await auditOrder(db, staff, orderId, "capture.reconcile", { attempt: latest.attempt });
  const settle = settleCapture(db, provider, {
    orderId,
    staff,
    appUrl,
    now,
    intentId: intent.id,
    transactionRef: intent.providerTransactionRef,
    purpose: intent.purpose,
    charged: intent.amountAgorot,
    finalTotal: o.finalTotalAgorot!,
    onHold: latest.amountAgorot,
    attempt: latest.attempt,
  });
  // Two clicks at once: the capture itself is idempotent; the second record attempt finds the order settled.
  return settle.catch(async (e) => {
    const [after] = await db.select({ status: order.status }).from(order).where(eq(order.id, orderId));
    if (after && after.status !== "CAPTURE_PENDING") return { ok: false as const, problem: { key: "WRONG_STATE" as const, status: after.status } };
    throw e;
  });
}

export function markPacked(db: Database, { orderId, staff, appUrl }: { orderId: string; staff: Staff; appUrl: string }) {
  return run(() =>
    db.transaction(async (tx) => {
      if (!can(staff.role as StaffRole, "PACK")) throw new Stop({ key: "NOT_PERMITTED" });
      const o = await lockOrder(tx, orderId);
      const moved = await applyOrderEvent(tx, { orderId, event: "PACKED", ctx: { actor: staff.role as StaffRole }, actorId: staff.id, appUrl });
      if (!moved.ok) throw new Stop({ key: "WRONG_STATE", status: o.status });
      await auditOrder(tx, staff, orderId, "order.packed");
      return { version: moved.order.version };
    }),
  );
}

export { MAX_CAPTURE_ATTEMPTS };
