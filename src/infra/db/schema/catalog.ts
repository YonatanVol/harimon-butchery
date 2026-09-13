import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  date,
  index,
  integer,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { agorotCol, createdAt, gramsCol, hebrewText, tsvector, updatedAt } from "./columns";
import {
  animalType,
  glattLevel,
  handlingFlag,
  nikurStatus,
  occasion,
  passoverStatus,
  pricingMode,
  saltedStatus,
  shechitaType,
} from "./enums";

export const category = pgTable("category", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  nameHe: hebrewText("name_he").notNull(),
  nameEn: text("name_en").notNull(),
  descriptionHe: text("description_he"),
  descriptionEn: text("description_en"),
  parentId: uuid("parent_id").references((): AnyPgColumn => category.id),
  image: text("image"),
  sortOrder: integer("sort_order").notNull().default(0),
  published: boolean("published").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Kashrut certifiers. In this demo every authority is fictional (`is_fictional`). */
export const kashrutAuthority = pgTable("kashrut_authority", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  nameHe: hebrewText("name_he").notNull(),
  nameEn: text("name_en").notNull(),
  badgeHe: text("badge_he").notNull(),
  badgeEn: text("badge_en").notNull(),
  certificateNumber: text("certificate_number").notNull(),
  certificateValidUntil: date("certificate_valid_until").notNull(),
  isFictional: boolean("is_fictional").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const product = pgTable(
  "product",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => category.id),
    nameHe: hebrewText("name_he").notNull(),
    nameEn: text("name_en").notNull(),
    shortDescHe: text("short_desc_he").notNull(),
    shortDescEn: text("short_desc_en").notNull(),
    longDescHe: text("long_desc_he"),
    longDescEn: text("long_desc_en"),
    cookingHe: text("cooking_he"),
    cookingEn: text("cooking_en"),
    animal: animalType("animal").notNull(),
    cutOriginHe: text("cut_origin_he"),
    cutOriginEn: text("cut_origin_en"),

    pricingMode: pricingMode("pricing_mode").notNull(),
    // WEIGHT mode
    pricePerKgAgorot: agorotCol("price_per_kg_agorot"),
    minOrderG: gramsCol("min_order_g"),
    maxOrderG: gramsCol("max_order_g"),
    stepG: gramsCol("step_g"),
    defaultOrderG: gramsCol("default_order_g"),
    toleranceBp: integer("tolerance_bp").notNull().default(1000),
    avgPieceG: gramsCol("avg_piece_g"),
    // PACKAGE mode
    packagePriceAgorot: agorotCol("package_price_agorot"),
    packageContentsHe: text("package_contents_he"),
    packageContentsEn: text("package_contents_en"),
    packageNominalG: gramsCol("package_nominal_g"),

    agingDays: integer("aging_days"),
    handlingFlags: handlingFlag("handling_flags").array().notNull().default(sql`'{}'`),
    occasions: occasion("occasions").array().notNull().default(sql`'{}'`),
    isBestSeller: boolean("is_best_seller").notNull().default(false),
    image: text("image"),
    imageAltHe: text("image_alt_he"),
    imageAltEn: text("image_alt_en"),
    published: boolean("published").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),

    searchVector: tsvector("search_vector").generatedAlwaysAs(
      sql`to_tsvector('simple'::regconfig, coalesce(name_he, '') || ' ' || coalesce(name_en, '') || ' ' || coalesce(short_desc_he, '') || ' ' || coalesce(short_desc_en, ''))`,
    ),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("product_category_idx").on(t.categoryId, t.sortOrder),
    index("product_search_idx").using("gin", t.searchVector),
    index("product_occasions_idx").using("gin", t.occasions),
    check(
      "product_weight_fields",
      sql`${t.pricingMode} <> 'WEIGHT' OR (
        ${t.pricePerKgAgorot} > 0 AND ${t.minOrderG} > 0 AND ${t.stepG} > 0
        AND ${t.minOrderG} <= ${t.defaultOrderG} AND ${t.defaultOrderG} <= ${t.maxOrderG}
      )`,
    ),
    check(
      "product_package_fields",
      sql`${t.pricingMode} <> 'PACKAGE' OR (${t.packagePriceAgorot} > 0 AND ${t.packageContentsHe} IS NOT NULL)`,
    ),
    check("product_tolerance_range", sql`${t.toleranceBp} >= 0 AND ${t.toleranceBp} < 10000`),
  ],
);

export const productKashrut = pgTable("product_kashrut", {
  productId: uuid("product_id")
    .primaryKey()
    .references(() => product.id, { onDelete: "cascade" }),
  authorityId: uuid("authority_id")
    .notNull()
    .references(() => kashrutAuthority.id),
  shechita: shechitaType("shechita").notNull(),
  glatt: glattLevel("glatt").notNull(),
  nikur: nikurStatus("nikur").notNull(),
  salted: saltedStatus("salted").notNull(),
  passover: passoverStatus("passover").notNull(),
  notesHe: text("notes_he"),
  notesEn: text("notes_en"),
});

/** A cut or preparation of a product ("sliced 2 cm", "whole piece"). Every product has a default. */
export const productVariant = pgTable(
  "product_variant",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    sku: text("sku").notNull().unique(),
    nameHe: hebrewText("name_he").notNull(),
    nameEn: text("name_en").notNull(),
    /** Per kg for WEIGHT products, per package for PACKAGE products. May be negative. */
    priceDeltaAgorot: integer("price_delta_agorot").notNull().default(0),
    cutInstructionHe: text("cut_instruction_he"),
    cutInstructionEn: text("cut_instruction_en"),
    isDefault: boolean("is_default").notNull().default(false),
    published: boolean("published").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [
    index("variant_product_idx").on(t.productId, t.sortOrder),
    uniqueIndex("variant_one_default_idx").on(t.productId).where(sql`${t.isDefault}`),
  ],
);
