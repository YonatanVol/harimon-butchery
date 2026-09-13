"use server";

import { db } from "../db/client";
import { appUrl, paymentProvider } from "../payments/factory";
import { currentStaff } from "../staff/session";
import { loadPackView, type PackView } from "./packView";
import * as w from "./weighing";

/** Every result carries the fresh order view — after a conflict or failure it is what the tablet needs most. */
type Result<T extends object> = w.WeighingResult<T> & { view: PackView | null };

async function withStaff<T extends object>(orderId: string, fn: (staff: { id: string; role: string }) => Promise<w.WeighingResult<T>>): Promise<Result<T>> {
  const staff = await currentStaff();
  if (!staff) return { ok: false, problem: { key: "NOT_PERMITTED" }, view: null };
  const result = await fn(staff);
  return { ...result, view: await loadPackView(orderId) };
}

export async function packRefresh(orderId: string) {
  return loadPackView(orderId);
}

export async function packStart(orderId: string) {
  return withStaff(orderId, (staff) => w.startPicking(db, { orderId, staff, appUrl: appUrl() }));
}

export async function packWeigh(input: { orderId: string; lineId: string; actualG: number; expectedVersion: number; confirmUnder?: boolean; giveExtraFree?: { managerId: string; pin: string } }) {
  return withStaff(input.orderId, (staff) => w.recordWeight(db, { ...input, staff }));
}

export async function packUndo(input: { orderId: string; lineId: string; expectedVersion: number }) {
  return withStaff(input.orderId, (staff) => w.undoLine(db, { ...input, staff }));
}

export async function packConfirmPackage(input: { orderId: string; lineId: string; expectedVersion: number }) {
  return withStaff(input.orderId, (staff) => w.confirmPackageLine(db, { ...input, staff }));
}

export async function packShort(input: { orderId: string; lineId: string; expectedVersion: number }) {
  return withStaff(input.orderId, (staff) => w.markShort(db, { ...input, staff }));
}

export async function packSubstituteOptions(lineId: string) {
  if (!(await currentStaff())) return [];
  return w.substituteCandidates(db, lineId);
}

export async function packSubstitute(input: { orderId: string; lineId: string; variantId: string; expectedVersion: number }) {
  return withStaff(input.orderId, (staff) => w.substituteLine(db, { ...input, staff }));
}

export async function packHandling(input: { orderId: string; lineId: string; expectedVersion: number }) {
  return withStaff(input.orderId, (staff) => w.confirmHandling(db, { ...input, staff }));
}

export async function packFinish(input: { orderId: string; expectedVersion: number }) {
  return withStaff(input.orderId, (staff) => w.finishWeighing(db, paymentProvider(), { ...input, staff, appUrl: appUrl() }));
}

export async function packRetryCapture(orderId: string) {
  return withStaff(orderId, (staff) => w.retryCapture(db, paymentProvider(), { orderId, staff, appUrl: appUrl() }));
}

export async function packMarkPacked(orderId: string) {
  return withStaff(orderId, (staff) => w.markPacked(db, { orderId, staff, appUrl: appUrl() }));
}
