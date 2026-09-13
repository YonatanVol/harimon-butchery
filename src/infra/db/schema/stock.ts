import { sql } from "drizzle-orm";
import { check, date, index, integer, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { product } from "./catalog";
import { createdAt, gramsCol, updatedAt } from "./columns";
import { stockMovementReason } from "./enums";
import { staffUser } from "./people";

/**
 * Current stock per product. Variants are preparations of the same meat ("whole", "2 cm steaks"),
 * so they share one stock. This row is a projection of `stock_movement`, rebuilt and compared in tests.
 */
export const stockItem = pgTable(
  "stock_item",
  {
    productId: uuid("product_id")
      .primaryKey()
      .references(() => product.id, { onDelete: "cascade" }),
    onHandG: gramsCol("on_hand_g").notNull().default(0),
    reservedG: gramsCol("reserved_g").notNull().default(0),
    onHandUnits: integer("on_hand_units").notNull().default(0),
    reservedUnits: integer("reserved_units").notNull().default(0),
    lowThresholdG: gramsCol("low_threshold_g").notNull().default(0),
    lowThresholdUnits: integer("low_threshold_units").notNull().default(0),
    nextRestockDate: date("next_restock_date"),
    updatedAt: updatedAt(),
  },
  (t) => [
    check(
      "stock_non_negative",
      sql`${t.onHandG} >= 0 AND ${t.reservedG} >= 0 AND ${t.onHandUnits} >= 0 AND ${t.reservedUnits} >= 0`,
    ),
  ],
);

export const stockMovement = pgTable(
  "stock_movement",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    deltaG: gramsCol("delta_g").notNull().default(0),
    deltaUnits: integer("delta_units").notNull().default(0),
    reason: stockMovementReason("reason").notNull(),
    orderId: uuid("order_id"),
    staffId: uuid("staff_id").references(() => staffUser.id),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [index("stock_movement_product_idx").on(t.productId, t.createdAt)],
);
