import { sql } from "drizzle-orm";
import { customType, integer, timestamp } from "drizzle-orm/pg-core";

/** Hebrew text that sorts correctly (final letters, niqqud). See docs/adr/0001-hebrew-collation.md. */
export const hebrewText = customType<{ data: string }>({
  dataType: () => 'text COLLATE "he-IL-x-icu"',
});

export const tsvector = customType<{ data: string }>({
  dataType: () => "tsvector",
});

/** Integer agorot. Never numeric, never float. */
export const agorotCol = (name: string) => integer(name);

/** Integer grams. */
export const gramsCol = (name: string) => integer(name);

export const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => sql`now()`);
