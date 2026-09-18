"use server";

import { and, eq, gt, isNull } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import type { LineProblem } from "@/domain/cart/cart";
import { resolveZone } from "@/domain/delivery/zones";
import { db } from "../db/client";
import { cart, cartLine, deliveryZone, slotHold } from "../db/schema";
import { addLine, cartLineCount, checkAmount, loadProductForVariant } from "./add";
import { holdSlotForCart } from "./holds";
import { findOpenCart, getOrCreateCart } from "./repository";
import { ensureCartToken, readCartToken } from "./session";

export type ActionProblem =
  | LineProblem
  | { key: "INVALID_INPUT" }
  | { key: "CART_NOT_FOUND" }
  | { key: "CITY_NOT_SERVED"; city: string }
  | { key: "ZONE_PAUSED"; city: string }
  | { key: "SLOT_CLOSED"; reasonHe: string; reasonEn: string }
  | { key: "SLOT_FULL" }
  | { key: "SLOT_PAST_CUTOFF" }
  | { key: "SLOT_TOO_SOON"; leadMinutes: number }
  | { key: "SLOT_WRONG_ZONE" }
  | { key: "NO_ACTIVE_HOLD" };

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; problem: ActionProblem };

const uuid = z.string().uuid();

const addSchema = z.object({
  variantId: uuid,
  requestedG: z.number().int().positive().nullable(),
  quantity: z.number().int().positive().nullable(),
  note: z.string().max(300),
  locale: z.enum(["he", "en"]),
});

export async function addToCart(input: z.infer<typeof addSchema>): Promise<ActionResult<{ count: number }>> {
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) return { ok: false, problem: { key: "INVALID_INPUT" } };
  const { variantId, requestedG, quantity, note, locale } = parsed.data;

  const token = await ensureCartToken();
  const current = await getOrCreateCart(token, locale);

  const added = await addLine(current.id, { variantId, requestedG, quantity, note });
  if (!added.ok) return { ok: false, problem: added.problem };
  return { ok: true, count: await cartLineCount(current.id) };
}

async function ownLine(lineId: string) {
  const token = await readCartToken();
  if (!token) return null;
  const current = await findOpenCart(token);
  if (!current) return null;
  const [line] = await db
    .select()
    .from(cartLine)
    .where(and(eq(cartLine.id, lineId), eq(cartLine.cartId, current.id)));
  return line ? { cart: current, line } : null;
}

export async function setLineAmount(input: { lineId: string; requestedG: number | null; quantity: number | null }): Promise<ActionResult> {
  if (!uuid.safeParse(input.lineId).success) return { ok: false, problem: { key: "INVALID_INPUT" } };
  const owned = await ownLine(input.lineId);
  if (!owned) return { ok: false, problem: { key: "CART_NOT_FOUND" } };
  const row = await loadProductForVariant(owned.line.variantId);
  if (!row) return { ok: false, problem: { key: "UNAVAILABLE" } };
  const amount =
    row.product.pricingMode === "WEIGHT"
      ? { requestedG: input.requestedG, quantity: null }
      : { requestedG: null, quantity: input.quantity };
  const problem = checkAmount(row, amount);
  if (problem) return { ok: false, problem };
  await db.update(cartLine).set(amount).where(eq(cartLine.id, input.lineId));
  refresh();
  return { ok: true };
}

export async function removeLine(lineId: string): Promise<ActionResult> {
  if (!uuid.safeParse(lineId).success) return { ok: false, problem: { key: "INVALID_INPUT" } };
  const owned = await ownLine(lineId);
  if (!owned) return { ok: false, problem: { key: "CART_NOT_FOUND" } };
  await db.delete(cartLine).where(eq(cartLine.id, lineId));
  refresh();
  return { ok: true };
}

export async function setLineSubstitute(lineId: string, allow: boolean): Promise<ActionResult> {
  if (!uuid.safeParse(lineId).success) return { ok: false, problem: { key: "INVALID_INPUT" } };
  const owned = await ownLine(lineId);
  if (!owned) return { ok: false, problem: { key: "CART_NOT_FOUND" } };
  await db.update(cartLine).set({ allowSubstitute: allow }).where(eq(cartLine.id, lineId));
  refresh();
  return { ok: true };
}

export async function setDeliveryCity(city: string): Promise<ActionResult<{ zoneSlug: string }>> {
  const clean = city.trim().slice(0, 80);
  if (!clean) return { ok: false, problem: { key: "INVALID_INPUT" } };
  const token = await readCartToken();
  const current = token ? await findOpenCart(token) : null;
  if (!current) return { ok: false, problem: { key: "CART_NOT_FOUND" } };

  const zones = await db.select().from(deliveryZone);
  const match = resolveZone(clean, zones);
  if (match.kind === "NOT_SERVED") return { ok: false, problem: { key: "CITY_NOT_SERVED", city: clean } };
  if (match.kind === "INACTIVE") return { ok: false, problem: { key: "ZONE_PAUSED", city: clean } };

  const zoneChanged = current.zoneId !== match.zoneId;
  await db.transaction(async (tx) => {
    await tx.update(cart).set({ city: clean, zoneId: match.zoneId }).where(eq(cart.id, current.id));
    if (zoneChanged) {
      // A held window belongs to the old zone; release it rather than keep a hold that can't be used.
      await tx
        .update(slotHold)
        .set({ releasedAt: new Date() })
        .where(and(eq(slotHold.cartId, current.id), isNull(slotHold.releasedAt)));
    }
  });
  refresh();
  return { ok: true, zoneSlug: zones.find((z) => z.id === match.zoneId)!.slug };
}

export async function holdSlot(slotId: string): Promise<ActionResult<{ expiresAt: string }>> {
  if (!uuid.safeParse(slotId).success) return { ok: false, problem: { key: "INVALID_INPUT" } };
  const token = await readCartToken();
  const current = token ? await findOpenCart(token) : null;
  if (!current?.zoneId) return { ok: false, problem: { key: "CART_NOT_FOUND" } };
  const result = await holdSlotForCart(db, { cartId: current.id, zoneId: current.zoneId, slotId });
  if (!result.ok) return result;
  refresh();
  return { ok: true, expiresAt: result.expiresAt.toISOString() };
}

export async function extendHold(): Promise<ActionResult<{ expiresAt: string }>> {
  const token = await readCartToken();
  const current = token ? await findOpenCart(token) : null;
  if (!current) return { ok: false, problem: { key: "CART_NOT_FOUND" } };
  const now = new Date();
  const [hold] = await db
    .select()
    .from(slotHold)
    .where(and(eq(slotHold.cartId, current.id), isNull(slotHold.releasedAt), gt(slotHold.expiresAt, now)));
  if (!hold) return { ok: false, problem: { key: "NO_ACTIVE_HOLD" } };
  // Holding again re-checks the window: it may have passed its cutoff while the customer was deciding.
  return holdSlot(hold.slotId);
}

export async function releaseHold(): Promise<ActionResult> {
  const token = await readCartToken();
  const current = token ? await findOpenCart(token) : null;
  if (!current) return { ok: false, problem: { key: "CART_NOT_FOUND" } };
  await db
    .update(slotHold)
    .set({ releasedAt: new Date() })
    .where(and(eq(slotHold.cartId, current.id), isNull(slotHold.releasedAt)));
  refresh();
  return { ok: true };
}
