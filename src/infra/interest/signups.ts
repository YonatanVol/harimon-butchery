import { and, eq, inArray, isNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { availabilityOf } from "@/domain/catalog/availability";
import { normalizeIsraeliMobile } from "@/domain/checkout/details";
import { normalizeCity, resolveZone } from "@/domain/delivery/zones";
import { renderTemplate, templateParams, type TemplateKey, type TemplateVars } from "@/domain/notifications/templates";
import type * as schema from "../db/schema";
import { customer, deliveryZone, interestSignup, notification, product, stockItem } from "../db/schema";

type Database = PostgresJsDatabase<typeof schema>;
// Callable inside an order transaction (stock returning on a cancellation) or on its own.
type Tx = Database | Parameters<Parameters<Database["transaction"]>[0]>[0];

export type InterestProblem = { key: "PHONE_INVALID" } | { key: "PHONE_NOT_MOBILE" } | { key: "NOT_FOUND" } | { key: "IN_STOCK" } | { key: "CITY_SERVED" } | { key: "CITY_INVALID" };
export type InterestResult = { ok: true; already: boolean } | { ok: false; problem: InterestProblem };

async function signUp(db: Database, kind: "RESTOCK" | "AREA", subject: string, phone: string, locale: "he" | "en"): Promise<InterestResult> {
  const parsed = normalizeIsraeliMobile(phone);
  if ("error" in parsed) return { ok: false, problem: { key: parsed.error } };
  const inserted = await db.insert(interestSignup).values({ kind, subject, phoneE164: parsed.e164, locale }).onConflictDoNothing().returning({ id: interestSignup.id });
  return { ok: true, already: inserted.length === 0 };
}

/** "Tell me when it's back" — only for something that is actually sold out right now. */
export async function signUpForRestock(db: Database, input: { productId: string; phone: string; locale: "he" | "en" }): Promise<InterestResult> {
  const [row] = await db.select({ product, stock: stockItem }).from(product).innerJoin(stockItem, eq(stockItem.productId, product.id)).where(eq(product.id, input.productId));
  if (!row || !row.product.published) return { ok: false, problem: { key: "NOT_FOUND" } };
  if (availabilityOf({ ...row.stock, pricingMode: row.product.pricingMode, minOrderG: row.product.minOrderG }).kind !== "OUT") return { ok: false, problem: { key: "IN_STOCK" } };
  return signUp(db, "RESTOCK", row.product.id, input.phone, input.locale);
}

/** "Tell me when you deliver to my city" — refused, kindly, for a city we already serve. */
export async function signUpForArea(db: Database, input: { city: string; phone: string; locale: "he" | "en" }): Promise<InterestResult> {
  const city = normalizeCity(input.city).slice(0, 60);
  if (city.length < 2) return { ok: false, problem: { key: "CITY_INVALID" } };
  const zones = await db.select().from(deliveryZone);
  if (resolveZone(city, zones).kind === "SERVED") return { ok: false, problem: { key: "CITY_SERVED" } };
  return signUp(db, "AREA", city, input.phone, input.locale);
}

async function sendOnce(tx: Tx, rows: Array<typeof interestSignup.$inferSelect>, key: TemplateKey, varsFor: (locale: "he" | "en") => TemplateVars, now: Date) {
  if (rows.length === 0) return 0;
  const phones = [...new Set(rows.map((r) => r.phoneE164))];
  const known = new Map((await tx.select({ id: customer.id, phone: customer.phoneE164 }).from(customer).where(inArray(customer.phoneE164, phones))).map((c) => [c.phone, c.id]));
  for (const r of rows) {
    const locale = r.locale === "en" ? "en" : "he";
    const vars = varsFor(locale);
    await tx
      .insert(notification)
      .values({
        customerId: known.get(r.phoneE164) ?? null,
        templateKey: key,
        channel: "WHATSAPP",
        provider: "MOCK",
        toE164: r.phoneE164,
        locale,
        renderedBody: renderTemplate(key, locale, vars).body,
        templateParams: templateParams(key, vars),
        idempotencyKey: `interest:${r.id}`,
      })
      .onConflictDoNothing();
  }
  await tx.update(interestSignup).set({ notifiedAt: now }).where(inArray(interestSignup.id, rows.map((r) => r.id)));
  return rows.length;
}

/** Call wherever stock can come back (goods received, a cancelled order restocked). Sends only if it is really orderable again. */
export async function notifyBackInStock(tx: Tx, { productId, appUrl, now = new Date() }: { productId: string; appUrl: string; now?: Date }) {
  const [row] = await tx.select({ product, stock: stockItem }).from(product).innerJoin(stockItem, eq(stockItem.productId, product.id)).where(eq(product.id, productId));
  if (!row || !row.product.published) return 0;
  if (availabilityOf({ ...row.stock, pricingMode: row.product.pricingMode, minOrderG: row.product.minOrderG }).kind === "OUT") return 0;
  const waiting = await tx.select().from(interestSignup).where(and(eq(interestSignup.kind, "RESTOCK"), eq(interestSignup.subject, productId), isNull(interestSignup.notifiedAt)));
  return sendOnce(
    tx,
    waiting,
    "interest.restocked",
    (locale) => ({ productName: locale === "he" ? row.product.nameHe : row.product.nameEn, productUrl: `${appUrl}/${locale}/p/${row.product.slug}` }),
    now,
  );
}

/** Call when a zone starts serving cities: everyone who asked about one of them hears once. */
export async function notifyAreaOpened(tx: Tx, { cities, appUrl, now = new Date() }: { cities: string[]; appUrl: string; now?: Date }) {
  let sent = 0;
  for (const name of cities) {
    const subject = normalizeCity(name);
    const waiting = await tx.select().from(interestSignup).where(and(eq(interestSignup.kind, "AREA"), eq(interestSignup.subject, subject), isNull(interestSignup.notifiedAt)));
    sent += await sendOnce(tx, waiting, "interest.area_opened", (locale) => ({ city: name, shopUrl: `${appUrl}/${locale}` }), now);
  }
  return sent;
}
