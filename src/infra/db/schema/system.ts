import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createdAt } from "./columns";
import { actorType } from "./enums";

/** Every staff mutation. Price changes, overrides, goodwill and refunds are the rows that matter. */
export const auditEvent = pgTable(
  "audit_event",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorType: actorType("actor_type").notNull(),
    actorId: uuid("actor_id"),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    action: text("action").notNull(),
    before: jsonb("before"),
    after: jsonb("after"),
    reason: text("reason"),
    createdAt: createdAt(),
  },
  (t) => [index("audit_entity_idx").on(t.entityType, t.entityId, t.createdAt)],
);

export const setting = pgTable("setting", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedBy: uuid("updated_by"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const idempotencyKey = pgTable("idempotency_key", {
  key: text("key").primaryKey(),
  scope: text("scope").notNull(),
  requestHash: text("request_hash").notNull(),
  response: jsonb("response"),
  createdAt: createdAt(),
});
