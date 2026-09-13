"use server";

import { refresh, revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "../db/client";
import { kickDispatch } from "../notify/kick";
import { appUrl } from "../payments/factory";
import { currentStaff } from "../staff/session";
import { addBlackout, applyWindowPlan, removeBlackout, updateZone } from "./manage";

const id = z.string().uuid();
const notPermitted = { ok: false as const, problem: { key: "NOT_PERMITTED" as const } };
const notFound = { ok: false as const, problem: { key: "NOT_FOUND" as const } };

function changed() {
  // Fees, minimums and delivery sentences appear across the storefront.
  revalidatePath("/[locale]", "layout");
  refresh();
}

export async function staffUpdateZone(input: { zoneId: string; citiesHe: string[]; citiesEn: string[]; deliveryFeeAgorot: number; freeDeliveryOverAgorot: number | null; minOrderAgorot: number; active: boolean }) {
  const staff = await currentStaff();
  if (!staff) return notPermitted;
  if (!id.safeParse(input.zoneId).success) return notFound;
  const r = await updateZone(db, {
    zoneId: input.zoneId,
    citiesHe: (input.citiesHe ?? []).map(String).slice(0, 40),
    citiesEn: (input.citiesEn ?? []).map(String).slice(0, 40),
    deliveryFeeAgorot: Number(input.deliveryFeeAgorot),
    freeDeliveryOverAgorot: input.freeDeliveryOverAgorot === null ? null : Number(input.freeDeliveryOverAgorot),
    minOrderAgorot: Number(input.minOrderAgorot),
    active: Boolean(input.active),
    staff,
    appUrl: appUrl(),
  });
  if (r.ok) {
    if (r.notified) kickDispatch();
    changed();
  }
  return r;
}

export async function staffAddBlackout(input: { date: string; fromTime: string | null; toTime: string | null; zoneId: string | null; reasonHe: string; reasonEn: string }) {
  const staff = await currentStaff();
  if (!staff) return notPermitted;
  if (input.zoneId !== null && !id.safeParse(input.zoneId).success) return notFound;
  const r = await addBlackout(db, { ...input, reasonHe: String(input.reasonHe ?? ""), reasonEn: String(input.reasonEn ?? ""), staff });
  if (r.ok) refresh();
  return r;
}

export async function staffRemoveBlackout(blackoutId: string) {
  const staff = await currentStaff();
  if (!staff) return notPermitted;
  if (!id.safeParse(blackoutId).success) return notFound;
  const r = await removeBlackout(db, { id: blackoutId, staff });
  if (r.ok) refresh();
  return r;
}

export async function staffApplyWindows() {
  const staff = await currentStaff();
  if (!staff) return notPermitted;
  const r = await applyWindowPlan(db, { days: 28, staff });
  if (r.ok) changed();
  return r;
}
