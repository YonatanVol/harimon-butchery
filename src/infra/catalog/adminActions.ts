"use server";

import { refresh, revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "../db/client";
import { currentStaff } from "../staff/session";
import { changePrice, setPublished } from "./admin";

const id = z.string().uuid();
const notPermitted = { ok: false as const, problem: { key: "NOT_PERMITTED" as const } };
const notFound = { ok: false as const, problem: { key: "NOT_FOUND" as const } };

export async function staffSetPublished(productId: string, published: boolean) {
  const staff = await currentStaff();
  if (!staff) return notPermitted;
  if (!id.safeParse(productId).success) return notFound;
  const r = await setPublished(db, { productId, published: Boolean(published), staff });
  if (r.ok) {
    revalidatePath("/[locale]", "layout");
    refresh();
  }
  return r;
}

export async function staffChangePrice(productId: string, newAgorot: number, expectedAgorot: number) {
  const staff = await currentStaff();
  if (!staff) return notPermitted;
  if (!id.safeParse(productId).success) return notFound;
  const r = await changePrice(db, { productId, newAgorot: Number(newAgorot), expectedAgorot: Number(expectedAgorot), staff });
  if (r.ok) {
    revalidatePath("/[locale]", "layout");
    refresh();
  }
  return r;
}
