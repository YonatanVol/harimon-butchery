/**
 * Prints SQL that brings a live database's catalog text in line with scripts/seed-data/catalog.ts — descriptions,
 * cooking notes, cut origin, category intros — without touching prices, stock, orders or anything else.
 * Usage: npx tsx scripts/catalog-copy-sql.ts > copy.sql   (then run it against the target database)
 */
import { categories, products } from "./seed-data/catalog";

const q = (s: string | undefined | null) => (s == null ? "NULL" : `'${s.replaceAll("'", "''")}'`);

const lines: string[] = ["BEGIN;"];
for (const p of products) {
  lines.push(
    `UPDATE product SET short_desc_he=${q(p.shortHe)}, short_desc_en=${q(p.shortEn)}, long_desc_he=${q(p.longHe)}, long_desc_en=${q(p.longEn)}, cooking_he=${q(p.cookingHe)}, cooking_en=${q(p.cookingEn)}, cut_origin_he=${q(p.originHe)}, cut_origin_en=${q(p.originEn)}, updated_at=now() WHERE slug=${q(p.slug)};`,
  );
}
for (const c of categories) {
  lines.push(`UPDATE category SET description_he=${q(c.descriptionHe)}, description_en=${q(c.descriptionEn)}, updated_at=now() WHERE slug=${q(c.slug)};`);
}
lines.push("COMMIT;");
console.log(lines.join("\n"));
