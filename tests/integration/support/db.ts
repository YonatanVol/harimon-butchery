import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/infra/db/schema";

export function connectTestDb(max = 25) {
  const url = process.env.DATABASE_URL_TEST!;
  if (!/meatstore_test/.test(url)) throw new Error(`Refusing to run integration tests against ${url}`);
  const client = postgres(url, { max, onnotice: () => {} });
  const db = drizzle(client, { schema, casing: "snake_case" });
  return { db, close: () => client.end() };
}

export type TestDb = ReturnType<typeof connectTestDb>["db"];

export async function truncateAll(db: TestDb) {
  await db.execute(sql`TRUNCATE
    notification, notification_suppression, payment_webhook_event, payment_refund, payment_capture,
    payment_intent, invoice, invoice_counter, order_status_event, order_line, orders, cart_line, cart,
    slot_hold, delivery_slot, delivery_slot_template, calendar_blackout, address, customer,
    stock_movement, stock_item, product_variant, product_kashrut, product, category,
    kashrut_authority, delivery_zone, staff_user, audit_event, setting, idempotency_key
    RESTART IDENTITY CASCADE`);
}

export async function makeZone(db: TestDb, overrides: Partial<typeof schema.deliveryZone.$inferInsert> = {}) {
  const [zone] = await db
    .insert(schema.deliveryZone)
    .values({
      slug: `zone-${Math.random().toString(36).slice(2, 8)}`,
      nameHe: "תל אביב",
      nameEn: "Tel Aviv",
      citiesHe: ["תל אביב"],
      citiesEn: ["Tel Aviv"],
      deliveryFeeAgorot: 2500,
      freeDeliveryOverAgorot: 35000,
      minOrderAgorot: 18000,
      leadTimeMinutes: 60,
      ...overrides,
    })
    .returning();
  return zone;
}

export async function makeSlot(db: TestDb, zoneId: string, overrides: Partial<typeof schema.deliverySlot.$inferInsert> = {}) {
  const startsAt = new Date(Date.now() + 2 * 86_400_000);
  const [slot] = await db
    .insert(schema.deliverySlot)
    .values({
      zoneId,
      serviceDate: startsAt.toISOString().slice(0, 10),
      startsAt,
      endsAt: new Date(startsAt.getTime() + 3 * 3_600_000),
      cutoffAt: new Date(startsAt.getTime() - 3 * 3_600_000),
      capacityOrders: 3,
      capacityWeightG: 45_000,
      status: "OPEN",
      ...overrides,
    })
    .returning();
  return slot;
}

export async function makeCart(db: TestDb, zoneId: string | null) {
  const [row] = await db
    .insert(schema.cart)
    .values({ anonymousToken: `t${Math.random().toString(36).slice(2)}${Date.now()}`, zoneId, city: "תל אביב" })
    .returning();
  return row;
}
