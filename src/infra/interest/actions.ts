"use server";

import { z } from "zod";
import { db } from "../db/client";
import { signUpForArea, signUpForRestock } from "./signups";

const locale = (l: string) => (l === "en" ? "en" : "he");

export async function joinRestockList(productId: string, phone: string, lang: string) {
  if (!z.string().uuid().safeParse(productId).success) return { ok: false as const, problem: { key: "NOT_FOUND" as const } };
  return signUpForRestock(db, { productId, phone: String(phone ?? "").slice(0, 30), locale: locale(lang) });
}

export async function joinAreaList(city: string, phone: string, lang: string) {
  return signUpForArea(db, { city: String(city ?? "").slice(0, 80), phone: String(phone ?? "").slice(0, 30), locale: locale(lang) });
}
