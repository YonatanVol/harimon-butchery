"use server";

import { refresh, revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "../db/client";
import { kickDispatch } from "../notify/kick";
import { appUrl } from "../payments/factory";
import { currentStaff } from "../staff/session";
import { changeStock, setRestockDate, type StockChange } from "./stock";

const id = z.string().uuid();
const KINDS = ["RECEIVED", "SPOILAGE", "COUNT_CORRECTION"] as const;

export async function staffChangeStock(input: { productId: string; kind: StockChange["kind"]; amount: number; note: string }) {
  const staff = await currentStaff();
  if (!staff) return { ok: false as const, problem: { key: "NOT_PERMITTED" as const } };
  if (!id.safeParse(input.productId).success || !KINDS.includes(input.kind)) return { ok: false as const, problem: { key: "NOT_FOUND" as const } };
  const r = await changeStock(db, { productId: input.productId, change: { kind: input.kind, amount: Number(input.amount) }, note: String(input.note ?? ""), staff, appUrl: appUrl() });
  if (r.ok) {
    kickDispatch();
    // Availability shows on cards, category pages and product pages alike.
    revalidatePath("/[locale]", "layout");
    refresh();
  }
  return r;
}

export async function staffSetRestockDate(productId: string, date: string | null) {
  const staff = await currentStaff();
  if (!staff) return { ok: false as const, problem: { key: "NOT_PERMITTED" as const } };
  if (!id.safeParse(productId).success) return { ok: false as const, problem: { key: "NOT_FOUND" as const } };
  const r = await setRestockDate(db, { productId, date: date || null, staff });
  if (r.ok) {
    revalidatePath("/[locale]", "layout");
    refresh();
  }
  return r;
}
