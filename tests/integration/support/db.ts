import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/infra/db/schema";

export function connectTestDb(max = 25) {
  const url = process.env.DATABASE_URL_TEST!;
  if (!/meatstore_test/.test(url)) throw new Error(`Refusing to run integration tests against ${url}`);
  const client = new Pool({ connectionString: url, max });
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
    kashrut_authority, delivery_zone, staff_user, audit_event, setting, idempotency_key, order_counter, mock_psp_transaction, customer_login_code, interest_signup, mock_psp_operation
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

export async function makeWeightProduct(
  db: TestDb,
  { pricePerKgAgorot = 16900, onHandG = 40_000, slug = `p-${Math.random().toString(36).slice(2, 8)}` } = {},
) {
  const [category] = await db
    .insert(schema.category)
    .values({ slug: `c-${slug}`, nameHe: "בקר", nameEn: "Beef" })
    .returning();
  const [authority] = await db
    .insert(schema.kashrutAuthority)
    .values({ slug: `a-${slug}`, nameHe: "בד״ץ בדוי", nameEn: "Fictional", badgeHe: "בדוי", badgeEn: "Fictional", certificateNumber: "X-1", certificateValidUntil: "2030-01-01" })
    .returning();
  const [p] = await db
    .insert(schema.product)
    .values({
      slug,
      categoryId: category.id,
      nameHe: "אנטריקוט",
      nameEn: "Entrecote",
      shortDescHe: "תיאור",
      shortDescEn: "Description",
      animal: "BEEF",
      pricingMode: "WEIGHT",
      pricePerKgAgorot,
      minOrderG: 250,
      maxOrderG: 5000,
      stepG: 250,
      defaultOrderG: 1000,
      toleranceBp: 1000,
    })
    .returning();
  await db.insert(schema.productKashrut).values({ productId: p.id, authorityId: authority.id, shechita: "BEIT_YOSEF", glatt: "GLATT_CHALAK", nikur: "MENUKAR", salted: "SALTED", passover: "KOSHER_LEPESACH" });
  const [variant] = await db.insert(schema.productVariant).values({ productId: p.id, sku: `${slug}-std`, nameHe: "רגיל", nameEn: "Standard", isDefault: true }).returning();
  await db.insert(schema.stockItem).values({ productId: p.id, onHandG, lowThresholdG: 3000 });
  return { product: p, variant };
}

export const validDetails = {
  firstName: "דנה",
  lastName: "כהן",
  phone: "054-123 4567",
  email: "",
  street: "אבן גבירול",
  houseNumber: "120",
  entrance: "",
  floor: "3",
  apartment: "12",
  intercom: "",
  deliveryNotes: "",
  giftRecipient: "",
  giftMessage: "",
};

/** A package product (fixed price per unit), e.g. a ₪149 family chicken bundle. */
export async function makePackageProduct(db: TestDb, { priceAgorot = 14_900, onHandUnits = 30 } = {}) {
  const w = await makeWeightProduct(db, { onHandG: 0 });
  await db
    .update(schema.product)
    .set({ pricingMode: "PACKAGE", pricePerKgAgorot: null, minOrderG: null, maxOrderG: null, stepG: null, defaultOrderG: null, packagePriceAgorot: priceAgorot, packageNominalG: 2000, packageContentsHe: "מארז", packageContentsEn: "Bundle" })
    .where(eq(schema.product.id, w.product.id));
  await db.update(schema.stockItem).set({ onHandUnits, lowThresholdUnits: 2 }).where(eq(schema.stockItem.productId, w.product.id));
  return w;
}

export async function makeStaff(db: TestDb, role: "OWNER" | "MANAGER" | "BUTCHER" | "PACKER" | "DRIVER" | "VIEWER", pin = "4321") {
  const { hashPin } = await import("@/infra/staff/pin");
  const [s] = await db
    .insert(schema.staffUser)
    .values({ phoneE164: `+97250${Math.floor(1_000_000 + Math.random() * 8_999_999)}`, fullNameHe: "צוות", fullNameEn: "Staff", role, pinHash: hashPin(pin) })
    .returning();
  return s;
}
