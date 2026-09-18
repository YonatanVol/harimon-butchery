CREATE TYPE "public"."review_status" AS ENUM('PENDING', 'PUBLISHED', 'REJECTED');--> statement-breakpoint
CREATE TABLE "product_review" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"body" text COLLATE "he-IL-x-icu" NOT NULL,
	"display_name" text COLLATE "he-IL-x-icu" NOT NULL,
	"locale" text DEFAULT 'he' NOT NULL,
	"status" "review_status" DEFAULT 'PENDING' NOT NULL,
	"moderation_note" text,
	"moderated_by_staff_id" uuid,
	"moderated_at" timestamp with time zone,
	"reply_body" text COLLATE "he-IL-x-icu",
	"replied_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_review_rating_range" CHECK ("product_review"."rating" BETWEEN 1 AND 5),
	CONSTRAINT "product_review_body_length" CHECK (char_length("product_review"."body") BETWEEN 10 AND 600),
	CONSTRAINT "product_review_locale" CHECK ("product_review"."locale" IN ('he', 'en')),
	CONSTRAINT "product_review_reply_paired" CHECK (("product_review"."reply_body" IS NULL) = ("product_review"."replied_at" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "product_review" ADD CONSTRAINT "product_review_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_review" ADD CONSTRAINT "product_review_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_review" ADD CONSTRAINT "product_review_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_review" ADD CONSTRAINT "product_review_moderated_by_staff_id_staff_user_id_fk" FOREIGN KEY ("moderated_by_staff_id") REFERENCES "public"."staff_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "product_review_once_per_order" ON "product_review" USING btree ("order_id","product_id");--> statement-breakpoint
CREATE INDEX "product_review_product_idx" ON "product_review" USING btree ("product_id","status","created_at");--> statement-breakpoint
CREATE INDEX "product_review_pending_idx" ON "product_review" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "product_review_customer_idx" ON "product_review" USING btree ("customer_id","created_at");