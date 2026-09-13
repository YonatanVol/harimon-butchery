/**
 * Demo orders in every state the shop can be in, created through the real flows — place order, mock
 * payment, weighing, capture, delivery — so the data can never disagree with the code that runs the shop.
 */
import { and, asc, desc, eq, gt, lt, lte, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { israelDateOf, toIsoDate } from "../src/domain/delivery/israelTime";
import { holdSlotForCart } from "../src/infra/cart/holds";
import * as s from "../src/infra/db/schema";
import { mockNotifier } from "../src/infra/notify/providers";
import { dispatchQueued } from "../src/infra/notify/dispatch";
import { resolveAuthorization } from "../src/infra/orders/authorization";
import { cancelByCustomer, decideExtra } from "../src/infra/orders/customer";
import { driverAction, refundOrder, shopDecision } from "../src/infra/orders/delivery";
import { placeOrder } from "../src/infra/orders/placeOrder";
import * as w from "../src/infra/orders/weighing";
import { createMockProvider, decideMockPayment, type MockScenario } from "../src/infra/payments/mock";

type Database = PostgresJsDatabase<typeof s>;
type Staff = { id: string; role: string };

type Target =
  | "AUTH_PENDING"
  | "AUTH_DECLINED"
  | "AUTHORIZED"
  | "PICKING"
  | "AWAITING_CUSTOMER_APPROVAL"
  | "CAPTURE_FAILED"
  | "CAPTURED"
  | "PACKED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERY_FAILED_NOT_HOME"
  | "DELIVERED"
  | "PARTIALLY_REFUNDED"
  | "CANCELLED_BY_CUSTOMER"
  | "CANCELLED_BY_SHOP"
  | "EXTRA_APPROVED";

type Line = { slug: string; multiple?: number; quantity?: number; note?: string };

const RECIPES: Record<string, Line[]> = {
  shabbat: [{ slug: "whole-chicken" }, { slug: "beef-shoulder" }, { slug: "ground-beef", multiple: 2 }],
  grill: [{ slug: "entrecote", multiple: 2, note: "חיתוך עבה, 3 ס״מ" }, { slug: "pargiyot", multiple: 2 }, { slug: "kebab-spiced" }],
  bundle: [{ slug: "grill-bundle-8", quantity: 1 }, { slug: "chicken-wings" }],
  family: [{ slug: "family-chicken-bundle", quantity: 1 }, { slug: "chicken-schnitzel", multiple: 2 }],
  weeknight: [{ slug: "chicken-breast", multiple: 2 }, { slug: "chicken-liver", multiple: 2 }, { slug: "ground-chicken", multiple: 2 }, { slug: "chicken-schnitzel" }],
  premium: [{ slug: "beef-fillet", multiple: 2 }, { slug: "aged-entrecote-28" }],
  holiday: [{ slug: "shabbat-bundle", quantity: 1 }, { slug: "brisket" }, { slug: "lamb-shoulder" }],
};

const PEOPLE = [
  { firstName: "מיכל", lastName: "אברהם", phone: "052-381 4472", street: "דיזנגוף", houseNumber: "210", floor: "4", apartment: "15" },
  { firstName: "יוסי", lastName: "פרידמן", phone: "054-229 1180", street: "ביאליק", houseNumber: "31", floor: "2", apartment: "6" },
  { firstName: "רונה", lastName: "שגיא", phone: "050-744 9021", street: "סוקולוב", houseNumber: "88", floor: "1", apartment: "3" },
  { firstName: "אלון", lastName: "מזרחי", phone: "053-610 3355", street: "הרצל", houseNumber: "142", floor: "7", apartment: "27" },
  { firstName: "תמר", lastName: "גולן", phone: "058-903 1276", street: "עמק רפאים", houseNumber: "54", floor: "0", apartment: "" },
  { firstName: "עידו", lastName: "רוזן", phone: "052-477 6609", street: "אחוזה", houseNumber: "119", floor: "3", apartment: "9" },
  { firstName: "נועה", lastName: "ביטון", phone: "054-812 5530", street: "ז׳בוטינסקי", houseNumber: "7", floor: "12", apartment: "48" },
  { firstName: "אריאל", lastName: "כץ", phone: "050-155 8843", street: "אבן גבירול", houseNumber: "64", floor: "5", apartment: "20" },
  { firstName: "שירה", lastName: "דהן", phone: "053-266 7014", street: "העצמאות", houseNumber: "23", floor: "2", apartment: "4" },
  { firstName: "דוד", lastName: "לוי", phone: "058-340 9918", street: "רוטשילד", houseNumber: "95", floor: "6", apartment: "12" },
  { firstName: "הילה", lastName: "נחום", phone: "052-918 2247", street: "הנשיאים", houseNumber: "16", floor: "1", apartment: "2" },
  { firstName: "גיל", lastName: "עמר", phone: "054-603 4481", street: "קרן היסוד", houseNumber: "40", floor: "3", apartment: "11" },
];

const PLAN: Array<{ zone: string; city: string; recipe: keyof typeof RECIPES; target: Target; scenario?: MockScenario; deliveryNote?: string }> = [
  { zone: "tel-aviv", city: "תל אביב", recipe: "shabbat", target: "DELIVERED" },
  { zone: "ramat-gan", city: "רמת גן", recipe: "bundle", target: "DELIVERED" },
  { zone: "tel-aviv", city: "תל אביב", recipe: "grill", target: "OUT_FOR_DELIVERY", deliveryNote: "קוד לבניין 1379#" },
  { zone: "sharon", city: "הרצליה", recipe: "family", target: "OUT_FOR_DELIVERY" },
  { zone: "tel-aviv", city: "תל אביב", recipe: "premium", target: "PACKED" },
  { zone: "rishon-holon", city: "חולון", recipe: "weeknight", target: "PACKED" },
  { zone: "ramat-gan", city: "גבעתיים", recipe: "shabbat", target: "DELIVERY_FAILED_NOT_HOME" },
  { zone: "jerusalem", city: "ירושלים", recipe: "holiday", target: "PARTIALLY_REFUNDED" },
  { zone: "tel-aviv", city: "תל אביב", recipe: "grill", target: "EXTRA_APPROVED" },
  { zone: "modiin", city: "מודיעין", recipe: "bundle", target: "CAPTURE_FAILED", scenario: "APPROVE_CAPTURE_FAILS" },
  { zone: "tel-aviv", city: "תל אביב", recipe: "grill", target: "AWAITING_CUSTOMER_APPROVAL" },
  { zone: "ramat-gan", city: "רמת גן", recipe: "weeknight", target: "PICKING" },
  { zone: "tel-aviv", city: "תל אביב", recipe: "holiday", target: "AUTHORIZED" },
  { zone: "sharon", city: "רעננה", recipe: "grill", target: "AUTHORIZED" },
  { zone: "tel-aviv", city: "יפו", recipe: "weeknight", target: "AUTHORIZED" },
  { zone: "rishon-holon", city: "ראשון לציון", recipe: "premium", target: "AUTHORIZED" },
  { zone: "tel-aviv", city: "תל אביב", recipe: "family", target: "AUTH_PENDING" },
  { zone: "sharon", city: "כפר סבא", recipe: "bundle", target: "AUTH_DECLINED", scenario: "DECLINE_INSUFFICIENT" },
  { zone: "tel-aviv", city: "תל אביב", recipe: "shabbat", target: "CANCELLED_BY_CUSTOMER" },
  { zone: "jerusalem", city: "מבשרת ציון", recipe: "grill", target: "CANCELLED_BY_SHOP" },
];

export async function seedDemoOrders(db: Database, appUrl: string) {
  const provider = createMockProvider(db, appUrl);
  const staffRows = await db.select().from(s.staffUser);
  const byRole = (role: string): Staff => {
    const m = staffRows.find((x) => x.role === role);
    if (!m) throw new Error(`seed: no ${role}`);
    return { id: m.id, role: m.role };
  };
  const butcher = byRole("BUTCHER");
  const packer = byRole("PACKER");
  const driver = byRole("DRIVER");
  const manager = byRole("MANAGER");
  const zones = Object.fromEntries((await db.select().from(s.deliveryZone)).map((z) => [z.slug, z]));
  const counts: Record<string, number> = {};

  const version = async (orderId: string) => (await db.select({ v: s.order.version }).from(s.order).where(eq(s.order.id, orderId)))[0].v;
  const must = <T extends { ok: boolean }>(label: string, r: T): T => {
    if (!r.ok) throw new Error(`seed ${label}: ${JSON.stringify((r as { problem?: unknown }).problem ?? r)}`);
    return r;
  };

  for (const [i, plan] of PLAN.entries()) {
    const zone = zones[plan.zone];
    const person = PEOPLE[i % PEOPLE.length];

    const [cart] = await db
      .insert(s.cart)
      .values({ anonymousToken: `seed-${i}-${Date.now().toString(36)}`, zoneId: zone.id, city: plan.city })
      .returning();
    for (const line of RECIPES[plan.recipe]) {
      const [row] = await db
        .select({ variant: s.productVariant, product: s.product })
        .from(s.productVariant)
        .innerJoin(s.product, eq(s.product.id, s.productVariant.productId))
        .where(and(eq(s.product.slug, line.slug), eq(s.productVariant.isDefault, true)));
      if (!row) throw new Error(`seed: no product ${line.slug}`);
      await db.insert(s.cartLine).values({
        cartId: cart.id,
        variantId: row.variant.id,
        requestedG: row.product.pricingMode === "WEIGHT" ? Math.min(row.product.defaultOrderG! * (line.multiple ?? 1), row.product.maxOrderG!) : null,
        quantity: row.product.pricingMode === "PACKAGE" ? (line.quantity ?? 1) : null,
        customerNote: line.note ?? null,
      });
    }

    // The soonest window this zone can still take.
    const windows = await db
      .select()
      .from(s.deliverySlot)
      .where(and(eq(s.deliverySlot.zoneId, zone.id), eq(s.deliverySlot.status, "OPEN"), gt(s.deliverySlot.cutoffAt, new Date())))
      .orderBy(asc(s.deliverySlot.startsAt))
      .limit(12);
    let held = false;
    // Spread orders over the first few windows instead of piling them into one.
    for (const slot of [...windows.slice(i % 4), ...windows.slice(0, i % 4)]) {
      if ((await holdSlotForCart(db, { cartId: cart.id, zoneId: zone.id, slotId: slot.id })).ok) {
        held = true;
        break;
      }
    }
    if (!held) throw new Error(`seed: no window for ${plan.zone}`);

    const placed = must(
      `place #${i} ${plan.recipe} ${plan.zone}`,
      await placeOrder(db, provider, {
        cartId: cart.id,
        details: { ...person, email: "", entrance: "", intercom: "", deliveryNotes: plan.deliveryNote ?? "" },
        locale: "he",
        appUrl,
      }),
    );
    if (!placed.ok) continue;
    const orderId = placed.orderId;
    counts[plan.target] = (counts[plan.target] ?? 0) + 1;
    if (plan.target === "AUTH_PENDING") continue;

    const [intent] = await db.select().from(s.paymentIntent).where(eq(s.paymentIntent.orderId, orderId));
    await decideMockPayment(db, intent.hostedPageRef!, plan.scenario ?? "APPROVE");
    await resolveAuthorization(db, provider, { intentId: intent.id, appUrl });
    if (plan.target === "AUTH_DECLINED" || plan.target === "AUTHORIZED") continue;

    const [o] = await db.select().from(s.order).where(eq(s.order.id, orderId));
    if (plan.target === "CANCELLED_BY_CUSTOMER") {
      must("cancel", await cancelByCustomer(db, provider, { orderNumber: o.orderNumber, token: o.accessToken, appUrl }));
      continue;
    }

    must("start", await w.startPicking(db, { orderId, staff: butcher, appUrl }));
    const lines = await db.select().from(s.orderLine).where(eq(s.orderLine.orderId, orderId)).orderBy(asc(s.orderLine.sortOrder));

    // Real pieces are rarely exact: alternate a little over and a little under, always inside the range.
    const weighLine = async (line: (typeof lines)[number], n: number) => {
      if (line.pricingMode === "PACKAGE") return must("package", await w.confirmPackageLine(db, { orderId, lineId: line.id, expectedVersion: await version(orderId), staff: butcher }));
      const drift = [0.04, -0.03, 0.02, 0.06, -0.01][n % 5];
      const actualG = Math.round((line.estimatedG! * (1 + drift)) / 5) * 5;
      must("weigh", await w.recordWeight(db, { orderId, lineId: line.id, actualG, expectedVersion: await version(orderId), staff: butcher, confirmUnder: true }));
      if (line.handlingFlags?.includes("REQUIRES_BROILING_TZLIYA") || line.handlingFlags?.includes("REQUIRES_SALTING")) {
        must("handling", await w.confirmHandling(db, { orderId, lineId: line.id, expectedVersion: await version(orderId), staff: butcher }));
      }
    };

    if (plan.target === "PICKING") {
      await weighLine(lines[0], 0);
      continue;
    }

    if (plan.target === "AWAITING_CUSTOMER_APPROVAL" || plan.target === "EXTRA_APPROVED") {
      const [first, ...rest] = lines;
      const actualG = Math.round((first.toleranceMaxG! * 1.18) / 10) * 10;
      must("ask", await w.askCustomer(db, { orderId, lineId: first.id, actualG, expectedVersion: await version(orderId), staff: butcher, appUrl, locale: "he" }));
      if (plan.target === "AWAITING_CUSTOMER_APPROVAL") {
        await weighLine(rest[0], 1);
        continue;
      }
      must("approve", await decideExtra(db, provider, { orderNumber: o.orderNumber, token: o.accessToken, decision: "APPROVE", appUrl }));
      for (const [n, line] of rest.entries()) await weighLine(line, n + 1);
      must("finish", await w.finishWeighing(db, provider, { orderId, expectedVersion: await version(orderId), staff: butcher, appUrl }));
      continue;
    }

    for (const [n, line] of lines.entries()) await weighLine(line, n);

    if (plan.target === "CANCELLED_BY_SHOP") {
      must("shop cancel", await shopDecision(db, provider, { orderId, decision: "CANCEL", reason: "הנתח לא עמד בבדיקת האיכות שלנו", staff: manager, appUrl }));
      continue;
    }

    const finished = await w.finishWeighing(db, provider, { orderId, expectedVersion: await version(orderId), staff: butcher, appUrl });
    if (plan.target === "CAPTURE_FAILED") continue;
    must("finish", finished);
    if (plan.target === "CAPTURED") continue;

    must("pack", await w.markPacked(db, { orderId, staff: packer, appUrl }));
    await moveToTodaysRun(db, orderId, i);
    if (plan.target === "PACKED") continue;

    must("dispatch", await driverAction(db, { orderId, event: "DISPATCHED", staff: driver, appUrl }));
    if (plan.target === "OUT_FOR_DELIVERY") continue;

    if (plan.target === "DELIVERED") {
      must("deliver", await driverAction(db, { orderId, event: "DELIVERED", staff: driver, appUrl }));
      continue;
    }

    must("not home", await driverAction(db, { orderId, event: "NOT_HOME", staff: driver, appUrl }));
    if (plan.target === "DELIVERY_FAILED_NOT_HOME") continue;

    must("return", await driverAction(db, { orderId, event: "RETURNED_TO_SHOP", staff: driver, appUrl }));
    const [captured] = await db.select().from(s.order).where(eq(s.order.id, orderId));
    must(
      "refund",
      await refundOrder(db, provider, { orderId, amountAgorot: Math.round((captured.capturedAgorot ?? 0) * 0.4), reason: "הלקוח לא היה זמין, חלק מהמוצרים נמכרו מחדש", staff: manager, appUrl }),
    );
  }

  // Everything above queued customer messages; send them the way the running app does (mock provider in demo mode).
  const { sent } = await dispatchQueued(db, mockNotifier, { limit: 1000 });

  return { counts, sent };
}

/**
 * Orders that have left the shop are shown on today's run — or the latest day the zone had open windows
 * (on Shabbat or a holiday) — keeping the windows' reserved counts consistent.
 */
async function moveToTodaysRun(db: Database, orderId: string, spread: number) {
  const [o] = await db.select().from(s.order).where(eq(s.order.id, orderId));
  const today = toIsoDate(israelDateOf(new Date()));
  const [latest] = await db
    .select({ serviceDate: s.deliverySlot.serviceDate })
    .from(s.deliverySlot)
    // The latest day this zone really delivered — never a Shabbat or holiday.
    .where(and(eq(s.deliverySlot.zoneId, o.zoneId), lte(s.deliverySlot.serviceDate, today), eq(s.deliverySlot.status, "OPEN")))
    .orderBy(desc(s.deliverySlot.serviceDate))
    .limit(1);
  if (!latest) return;
  const sameDay = await db
    .select()
    .from(s.deliverySlot)
    .where(and(eq(s.deliverySlot.zoneId, o.zoneId), eq(s.deliverySlot.serviceDate, latest.serviceDate), eq(s.deliverySlot.status, "OPEN"), lt(s.deliverySlot.reservedOrders, s.deliverySlot.capacityOrders)))
    .orderBy(asc(s.deliverySlot.startsAt));
  const slot = sameDay[spread % Math.max(sameDay.length, 1)];
  if (!slot || slot.id === o.slotId) return;
  await db.transaction(async (tx) => {
    if (o.slotId) {
      await tx
        .update(s.deliverySlot)
        .set({ reservedOrders: sql`greatest(${s.deliverySlot.reservedOrders} - 1, 0)`, reservedWeightG: sql`greatest(${s.deliverySlot.reservedWeightG} - ${o.reservedWeightG}, 0)` })
        .where(eq(s.deliverySlot.id, o.slotId));
    }
    await tx
      .update(s.deliverySlot)
      .set({ reservedOrders: sql`${s.deliverySlot.reservedOrders} + 1`, reservedWeightG: sql`${s.deliverySlot.reservedWeightG} + ${o.reservedWeightG}` })
      .where(eq(s.deliverySlot.id, slot.id));
    await tx.update(s.order).set({ slotId: slot.id }).where(eq(s.order.id, orderId));
  });
}
