CREATE TYPE "public"."actor_type" AS ENUM('CUSTOMER', 'STAFF', 'SYSTEM', 'PSP');--> statement-breakpoint
CREATE TYPE "public"."animal_type" AS ENUM('BEEF', 'VEAL', 'LAMB', 'CHICKEN', 'TURKEY', 'MIXED');--> statement-breakpoint
CREATE TYPE "public"."blackout_source" AS ENUM('HEBCAL', 'MANUAL');--> statement-breakpoint
CREATE TYPE "public"."capture_status" AS ENUM('PENDING', 'SUCCEEDED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."cart_status" AS ENUM('OPEN', 'CONVERTED', 'ABANDONED');--> statement-breakpoint
CREATE TYPE "public"."glatt_level" AS ENUM('GLATT_CHALAK', 'GLATT', 'REGULAR');--> statement-breakpoint
CREATE TYPE "public"."handling_flag" AS ENUM('REQUIRES_BROILING_TZLIYA', 'REQUIRES_SALTING', 'FROZEN', 'BONE_IN', 'VACUUM_PACKED');--> statement-breakpoint
CREATE TYPE "public"."nikur_status" AS ENUM('MENUKAR', 'NOT_MENUKAR', 'NOT_APPLICABLE');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('WHATSAPP', 'SMS', 'EMAIL');--> statement-breakpoint
CREATE TYPE "public"."notification_provider" AS ENUM('MOCK', 'WHATSAPP_CLOUD', 'INFORU');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'SUPPRESSED');--> statement-breakpoint
CREATE TYPE "public"."occasion" AS ENUM('SHABBAT', 'GRILL', 'HOLIDAY', 'SLOW_COOK', 'WEEKNIGHT');--> statement-breakpoint
CREATE TYPE "public"."order_line_status" AS ENUM('PENDING', 'WEIGHED', 'SUBSTITUTED', 'SHORT', 'CANCELLED', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('PLACED', 'AUTH_PENDING', 'AUTHORIZED', 'AUTH_DECLINED', 'AUTH_EXPIRED', 'PICKING', 'AWAITING_CUSTOMER_APPROVAL', 'WEIGHED', 'REPRICED', 'CAPTURE_PENDING', 'CAPTURED', 'CAPTURE_FAILED', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'DELIVERY_FAILED_NOT_HOME', 'RESCHEDULED', 'RETURNED_TO_SHOP', 'REFUND_PENDING', 'REFUNDED', 'PARTIALLY_REFUNDED', 'CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_SHOP', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."over_tolerance_policy" AS ENUM('TRIM_TO_CEILING', 'ASK_CUSTOMER');--> statement-breakpoint
CREATE TYPE "public"."passover_status" AS ENUM('KOSHER_LEPESACH', 'NOT_FOR_PESACH');--> statement-breakpoint
CREATE TYPE "public"."payment_intent_status" AS ENUM('CREATED', 'REDIRECTED', 'AUTHORIZED', 'DECLINED', 'EXPIRED', 'VOIDED');--> statement-breakpoint
CREATE TYPE "public"."payment_provider" AS ENUM('MOCK', 'PAYPLUS');--> statement-breakpoint
CREATE TYPE "public"."pricing_mode" AS ENUM('WEIGHT', 'PACKAGE');--> statement-breakpoint
CREATE TYPE "public"."refund_status" AS ENUM('PENDING', 'SUCCEEDED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."salted_status" AS ENUM('SALTED', 'REQUIRES_SALTING', 'NOT_APPLICABLE');--> statement-breakpoint
CREATE TYPE "public"."shechita_type" AS ENUM('BEIT_YOSEF', 'ASHKENAZI', 'CHABAD');--> statement-breakpoint
CREATE TYPE "public"."slot_status" AS ENUM('OPEN', 'CLOSED', 'BLACKOUT');--> statement-breakpoint
CREATE TYPE "public"."staff_role" AS ENUM('OWNER', 'MANAGER', 'BUTCHER', 'PACKER', 'DRIVER', 'VIEWER');--> statement-breakpoint
CREATE TYPE "public"."stock_movement_reason" AS ENUM('RECEIVED', 'RESERVED', 'RELEASED', 'PICKED', 'TRIM_LOSS', 'SPOILAGE', 'RETURN', 'MANUAL_ADJUST', 'COUNT_CORRECTION');--> statement-breakpoint
CREATE TYPE "public"."weighing_source" AS ENUM('MANUAL', 'SCALE');--> statement-breakpoint
CREATE TABLE "category" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name_he" text COLLATE "he-IL-x-icu" NOT NULL,
	"name_en" text NOT NULL,
	"description_he" text,
	"description_en" text,
	"parent_id" uuid,
	"image" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "category_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "kashrut_authority" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name_he" text COLLATE "he-IL-x-icu" NOT NULL,
	"name_en" text NOT NULL,
	"badge_he" text NOT NULL,
	"badge_en" text NOT NULL,
	"certificate_number" text NOT NULL,
	"certificate_valid_until" date NOT NULL,
	"is_fictional" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kashrut_authority_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "product" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"category_id" uuid NOT NULL,
	"name_he" text COLLATE "he-IL-x-icu" NOT NULL,
	"name_en" text NOT NULL,
	"short_desc_he" text NOT NULL,
	"short_desc_en" text NOT NULL,
	"long_desc_he" text,
	"long_desc_en" text,
	"cooking_he" text,
	"cooking_en" text,
	"animal" "animal_type" NOT NULL,
	"cut_origin_he" text,
	"cut_origin_en" text,
	"pricing_mode" "pricing_mode" NOT NULL,
	"price_per_kg_agorot" integer,
	"min_order_g" integer,
	"max_order_g" integer,
	"step_g" integer,
	"default_order_g" integer,
	"tolerance_bp" integer DEFAULT 1000 NOT NULL,
	"avg_piece_g" integer,
	"package_price_agorot" integer,
	"package_contents_he" text,
	"package_contents_en" text,
	"package_nominal_g" integer,
	"aging_days" integer,
	"handling_flags" "handling_flag"[] DEFAULT '{}' NOT NULL,
	"occasions" "occasion"[] DEFAULT '{}' NOT NULL,
	"is_best_seller" boolean DEFAULT false NOT NULL,
	"image" text,
	"image_alt_he" text,
	"image_alt_en" text,
	"published" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('simple'::regconfig, coalesce(name_he, '') || ' ' || coalesce(name_en, '') || ' ' || coalesce(short_desc_he, '') || ' ' || coalesce(short_desc_en, ''))) STORED,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_slug_unique" UNIQUE("slug"),
	CONSTRAINT "product_weight_fields" CHECK ("product"."pricing_mode" <> 'WEIGHT' OR (
        "product"."price_per_kg_agorot" > 0 AND "product"."min_order_g" > 0 AND "product"."step_g" > 0
        AND "product"."min_order_g" <= "product"."default_order_g" AND "product"."default_order_g" <= "product"."max_order_g"
      )),
	CONSTRAINT "product_package_fields" CHECK ("product"."pricing_mode" <> 'PACKAGE' OR ("product"."package_price_agorot" > 0 AND "product"."package_contents_he" IS NOT NULL)),
	CONSTRAINT "product_tolerance_range" CHECK ("product"."tolerance_bp" >= 0 AND "product"."tolerance_bp" < 10000)
);
--> statement-breakpoint
CREATE TABLE "product_kashrut" (
	"product_id" uuid PRIMARY KEY NOT NULL,
	"authority_id" uuid NOT NULL,
	"shechita" "shechita_type" NOT NULL,
	"glatt" "glatt_level" NOT NULL,
	"nikur" "nikur_status" NOT NULL,
	"salted" "salted_status" NOT NULL,
	"passover" "passover_status" NOT NULL,
	"notes_he" text,
	"notes_en" text
);
--> statement-breakpoint
CREATE TABLE "product_variant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"sku" text NOT NULL,
	"name_he" text COLLATE "he-IL-x-icu" NOT NULL,
	"name_en" text NOT NULL,
	"price_delta_agorot" integer DEFAULT 0 NOT NULL,
	"cut_instruction_he" text,
	"cut_instruction_en" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "product_variant_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE "calendar_blackout" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"from_time" time,
	"to_time" time,
	"zone_id" uuid,
	"reason_he" text NOT NULL,
	"reason_en" text NOT NULL,
	"source" "blackout_source" NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivery_slot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"zone_id" uuid NOT NULL,
	"template_id" uuid,
	"service_date" date NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"cutoff_at" timestamp with time zone NOT NULL,
	"capacity_orders" integer NOT NULL,
	"reserved_orders" integer DEFAULT 0 NOT NULL,
	"capacity_weight_g" integer NOT NULL,
	"reserved_weight_g" integer DEFAULT 0 NOT NULL,
	"status" "slot_status" DEFAULT 'OPEN' NOT NULL,
	"blackout_reason_he" text,
	"blackout_reason_en" text,
	"hebrew_date_he" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "slot_zone_start_uq" UNIQUE("zone_id","starts_at"),
	CONSTRAINT "slot_orders_capacity" CHECK ("delivery_slot"."reserved_orders" >= 0 AND "delivery_slot"."reserved_orders" <= "delivery_slot"."capacity_orders"),
	CONSTRAINT "slot_weight_capacity" CHECK ("delivery_slot"."reserved_weight_g" >= 0 AND "delivery_slot"."reserved_weight_g" <= "delivery_slot"."capacity_weight_g"),
	CONSTRAINT "slot_times" CHECK ("delivery_slot"."starts_at" < "delivery_slot"."ends_at" AND "delivery_slot"."cutoff_at" <= "delivery_slot"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "delivery_slot_template" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"zone_id" uuid NOT NULL,
	"weekday" smallint NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"capacity_orders" integer NOT NULL,
	"capacity_weight_g" integer NOT NULL,
	"cutoff_lead_minutes" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "template_weekday" CHECK ("delivery_slot_template"."weekday" BETWEEN 0 AND 6),
	CONSTRAINT "template_times" CHECK ("delivery_slot_template"."start_time" < "delivery_slot_template"."end_time")
);
--> statement-breakpoint
CREATE TABLE "delivery_zone" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name_he" text COLLATE "he-IL-x-icu" NOT NULL,
	"name_en" text NOT NULL,
	"cities_he" text[] NOT NULL,
	"cities_en" text[] NOT NULL,
	"delivery_fee_agorot" integer NOT NULL,
	"free_delivery_over_agorot" integer,
	"min_order_agorot" integer NOT NULL,
	"lead_time_minutes" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "delivery_zone_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "slot_hold" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slot_id" uuid NOT NULL,
	"cart_id" uuid NOT NULL,
	"weight_g" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"released_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid,
	"customer_id" uuid,
	"template_key" text NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"provider" "notification_provider" NOT NULL,
	"to_e164" text NOT NULL,
	"locale" text NOT NULL,
	"rendered_body" text NOT NULL,
	"actions" jsonb,
	"status" "notification_status" DEFAULT 'QUEUED' NOT NULL,
	"provider_message_id" text,
	"failure_reason" text,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"read_at" timestamp with time zone,
	CONSTRAINT "notification_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "notification_suppression" (
	"customer_id" uuid NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_suppression_customer_id_channel_pk" PRIMARY KEY("customer_id","channel")
);
--> statement-breakpoint
CREATE TABLE "cart" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid,
	"anonymous_token" text,
	"locale" text DEFAULT 'he' NOT NULL,
	"zone_id" uuid,
	"address_id" uuid,
	"status" "cart_status" DEFAULT 'OPEN' NOT NULL,
	"converted_order_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cart_anonymous_token_unique" UNIQUE("anonymous_token"),
	CONSTRAINT "cart_owner" CHECK ("cart"."customer_id" IS NOT NULL OR "cart"."anonymous_token" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "cart_line" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cart_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"requested_g" integer,
	"quantity" integer,
	"allow_substitute" boolean DEFAULT true NOT NULL,
	"customer_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cart_line_amount" CHECK (("cart_line"."requested_g" > 0 AND "cart_line"."quantity" IS NULL) OR ("cart_line"."quantity" > 0 AND "cart_line"."requested_g" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_number" text NOT NULL,
	"customer_id" uuid NOT NULL,
	"address_snapshot" jsonb NOT NULL,
	"zone_id" uuid NOT NULL,
	"slot_id" uuid,
	"locale" text NOT NULL,
	"status" "order_status" NOT NULL,
	"partially_fulfilled" boolean DEFAULT false NOT NULL,
	"unpaid_dispatch" boolean DEFAULT false NOT NULL,
	"items_estimate_agorot" integer NOT NULL,
	"delivery_fee_agorot" integer NOT NULL,
	"estimate_total_agorot" integer NOT NULL,
	"authorization_ceiling_agorot" integer NOT NULL,
	"items_final_agorot" integer,
	"final_total_agorot" integer,
	"captured_agorot" integer,
	"refunded_agorot" integer DEFAULT 0 NOT NULL,
	"goodwill_agorot" integer DEFAULT 0 NOT NULL,
	"vat_rate_bp" integer NOT NULL,
	"over_tolerance_policy" "over_tolerance_policy" DEFAULT 'TRIM_TO_CEILING' NOT NULL,
	"placed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"authorized_at" timestamp with time zone,
	"picking_started_at" timestamp with time zone,
	"weighed_at" timestamp with time zone,
	"captured_at" timestamp with time zone,
	"packed_at" timestamp with time zone,
	"dispatched_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancel_reason_key" text,
	"assigned_butcher_id" uuid,
	"assigned_driver_id" uuid,
	"customer_note" text,
	"internal_note" text,
	"delivery_attempts" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_order_number_unique" UNIQUE("order_number"),
	CONSTRAINT "orders_capture_within_hold" CHECK ("orders"."captured_agorot" IS NULL OR "orders"."captured_agorot" <= "orders"."authorization_ceiling_agorot"),
	CONSTRAINT "orders_refund_within_capture" CHECK ("orders"."refunded_agorot" >= 0 AND "orders"."refunded_agorot" <= coalesce("orders"."captured_agorot", 0)),
	CONSTRAINT "orders_locale" CHECK ("orders"."locale" IN ('he', 'en'))
);
--> statement-breakpoint
CREATE TABLE "order_line" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"product_name_he" text NOT NULL,
	"product_name_en" text NOT NULL,
	"variant_name_he" text NOT NULL,
	"variant_name_en" text NOT NULL,
	"pricing_mode" "pricing_mode" NOT NULL,
	"price_per_kg_agorot" integer,
	"estimated_g" integer,
	"tolerance_bp" integer,
	"tolerance_min_g" integer,
	"tolerance_max_g" integer,
	"actual_g" integer,
	"unit_price_agorot" integer,
	"quantity" integer,
	"actual_quantity" integer,
	"estimate_agorot" integer NOT NULL,
	"ceiling_agorot" integer NOT NULL,
	"final_agorot" integer,
	"status" "order_line_status" DEFAULT 'PENDING' NOT NULL,
	"substituted_with_variant_id" uuid,
	"substitution_reason_key" text,
	"allow_substitute" boolean DEFAULT true NOT NULL,
	"weighed_by_staff_id" uuid,
	"weighed_at" timestamp with time zone,
	"weighing_source" "weighing_source",
	"cut_instruction_he" text,
	"cut_instruction_en" text,
	"customer_note" text,
	"handling_flags" "handling_flag"[] DEFAULT '{}' NOT NULL,
	"handling_confirmed_at" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "order_line_actual_positive" CHECK ("order_line"."actual_g" IS NULL OR "order_line"."actual_g" > 0),
	CONSTRAINT "order_line_weight_fields" CHECK ("order_line"."pricing_mode" <> 'WEIGHT' OR ("order_line"."price_per_kg_agorot" > 0 AND "order_line"."estimated_g" > 0 AND "order_line"."tolerance_min_g" <= "order_line"."estimated_g" AND "order_line"."estimated_g" <= "order_line"."tolerance_max_g")),
	CONSTRAINT "order_line_package_fields" CHECK ("order_line"."pricing_mode" <> 'PACKAGE' OR ("order_line"."unit_price_agorot" > 0 AND "order_line"."quantity" > 0)),
	CONSTRAINT "order_line_final_within_ceiling" CHECK ("order_line"."final_agorot" IS NULL OR "order_line"."final_agorot" <= "order_line"."ceiling_agorot")
);
--> statement-breakpoint
CREATE TABLE "order_status_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"from_status" "order_status",
	"to_status" "order_status" NOT NULL,
	"event_key" text NOT NULL,
	"reason_key" text,
	"actor_type" "actor_type" NOT NULL,
	"actor_id" uuid,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"sequence" integer NOT NULL,
	"number" text NOT NULL,
	"gross_agorot" integer NOT NULL,
	"vat_agorot" integer NOT NULL,
	"net_agorot" integer NOT NULL,
	"vat_rate_bp" integer NOT NULL,
	"lines" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoice_order_id_unique" UNIQUE("order_id"),
	CONSTRAINT "invoice_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "invoice_counter" (
	"year" integer PRIMARY KEY NOT NULL,
	"last_sequence" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_capture" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_intent_id" uuid NOT NULL,
	"amount_agorot" integer NOT NULL,
	"status" "capture_status" DEFAULT 'PENDING' NOT NULL,
	"attempt" integer NOT NULL,
	"idempotency_key" text NOT NULL,
	"provider_capture_ref" text,
	"failure_code" text,
	"failure_reason_key" text,
	"raw_response" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"settled_at" timestamp with time zone,
	CONSTRAINT "payment_capture_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "payment_capture_amount" CHECK ("payment_capture"."amount_agorot" >= 0)
);
--> statement-breakpoint
CREATE TABLE "payment_intent" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"provider" "payment_provider" NOT NULL,
	"sandbox" boolean NOT NULL,
	"purpose" text DEFAULT 'ORDER' NOT NULL,
	"amount_agorot" integer NOT NULL,
	"status" "payment_intent_status" DEFAULT 'CREATED' NOT NULL,
	"hosted_page_ref" text,
	"hosted_page_url" text,
	"provider_transaction_ref" text,
	"approval_number" text,
	"token_ref" text,
	"card_brand" text,
	"card_last4" text,
	"decline_code" text,
	"decline_reason_key" text,
	"raw_response" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"authorized_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	CONSTRAINT "payment_intent_amount" CHECK ("payment_intent"."amount_agorot" > 0),
	CONSTRAINT "payment_intent_last4" CHECK ("payment_intent"."card_last4" IS NULL OR "payment_intent"."card_last4" ~ '^[0-9]{4}$')
);
--> statement-breakpoint
CREATE TABLE "payment_refund" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_intent_id" uuid NOT NULL,
	"amount_agorot" integer NOT NULL,
	"reason_key" text NOT NULL,
	"requested_by_staff_id" uuid,
	"status" "refund_status" DEFAULT 'PENDING' NOT NULL,
	"idempotency_key" text NOT NULL,
	"provider_refund_ref" text,
	"raw_response" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_refund_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "payment_refund_amount" CHECK ("payment_refund"."amount_agorot" > 0)
);
--> statement-breakpoint
CREATE TABLE "payment_webhook_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" "payment_provider" NOT NULL,
	"provider_event_id" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"processing_error" text,
	CONSTRAINT "payment_webhook_event_provider_event_id_unique" UNIQUE("provider_event_id")
);
--> statement-breakpoint
CREATE TABLE "address" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"label" text,
	"city" text COLLATE "he-IL-x-icu" NOT NULL,
	"street" text COLLATE "he-IL-x-icu" NOT NULL,
	"house_number" text NOT NULL,
	"entrance" text,
	"floor" text,
	"apartment" text,
	"intercom" text,
	"has_elevator" boolean,
	"delivery_notes" text,
	"recipient_name" text,
	"recipient_phone_e164" text,
	"zone_id" uuid,
	"is_default" boolean DEFAULT false NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone_e164" text NOT NULL,
	"phone_verified_at" timestamp with time zone,
	"email" text,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"preferred_locale" text DEFAULT 'he' NOT NULL,
	"marketing_opt_in" boolean DEFAULT false NOT NULL,
	"notes" text,
	"blocked_at" timestamp with time zone,
	"blocked_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_phone_e164_unique" UNIQUE("phone_e164"),
	CONSTRAINT "customer_locale" CHECK ("customer"."preferred_locale" IN ('he', 'en')),
	CONSTRAINT "customer_phone_e164" CHECK ("customer"."phone_e164" ~ '^\+972[0-9]{8,9}$')
);
--> statement-breakpoint
CREATE TABLE "staff_user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone_e164" text NOT NULL,
	"full_name_he" text COLLATE "he-IL-x-icu" NOT NULL,
	"full_name_en" text NOT NULL,
	"role" "staff_role" NOT NULL,
	"pin_hash" text,
	"active" boolean DEFAULT true NOT NULL,
	"last_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_user_phone_e164_unique" UNIQUE("phone_e164")
);
--> statement-breakpoint
CREATE TABLE "stock_item" (
	"product_id" uuid PRIMARY KEY NOT NULL,
	"on_hand_g" integer DEFAULT 0 NOT NULL,
	"reserved_g" integer DEFAULT 0 NOT NULL,
	"on_hand_units" integer DEFAULT 0 NOT NULL,
	"reserved_units" integer DEFAULT 0 NOT NULL,
	"low_threshold_g" integer DEFAULT 0 NOT NULL,
	"low_threshold_units" integer DEFAULT 0 NOT NULL,
	"next_restock_date" date,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stock_non_negative" CHECK ("stock_item"."on_hand_g" >= 0 AND "stock_item"."reserved_g" >= 0 AND "stock_item"."on_hand_units" >= 0 AND "stock_item"."reserved_units" >= 0)
);
--> statement-breakpoint
CREATE TABLE "stock_movement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"delta_g" integer DEFAULT 0 NOT NULL,
	"delta_units" integer DEFAULT 0 NOT NULL,
	"reason" "stock_movement_reason" NOT NULL,
	"order_id" uuid,
	"staff_id" uuid,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_type" "actor_type" NOT NULL,
	"actor_id" uuid,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"action" text NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idempotency_key" (
	"key" text PRIMARY KEY NOT NULL,
	"scope" text NOT NULL,
	"request_hash" text NOT NULL,
	"response" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "setting" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "category" ADD CONSTRAINT "category_parent_id_category_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."category"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_kashrut" ADD CONSTRAINT "product_kashrut_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_kashrut" ADD CONSTRAINT "product_kashrut_authority_id_kashrut_authority_id_fk" FOREIGN KEY ("authority_id") REFERENCES "public"."kashrut_authority"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variant" ADD CONSTRAINT "product_variant_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_blackout" ADD CONSTRAINT "calendar_blackout_zone_id_delivery_zone_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."delivery_zone"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_slot" ADD CONSTRAINT "delivery_slot_zone_id_delivery_zone_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."delivery_zone"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_slot" ADD CONSTRAINT "delivery_slot_template_id_delivery_slot_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."delivery_slot_template"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_slot_template" ADD CONSTRAINT "delivery_slot_template_zone_id_delivery_zone_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."delivery_zone"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slot_hold" ADD CONSTRAINT "slot_hold_slot_id_delivery_slot_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."delivery_slot"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_suppression" ADD CONSTRAINT "notification_suppression_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart" ADD CONSTRAINT "cart_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart" ADD CONSTRAINT "cart_zone_id_delivery_zone_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."delivery_zone"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart" ADD CONSTRAINT "cart_address_id_address_id_fk" FOREIGN KEY ("address_id") REFERENCES "public"."address"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_line" ADD CONSTRAINT "cart_line_cart_id_cart_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."cart"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_line" ADD CONSTRAINT "cart_line_variant_id_product_variant_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_zone_id_delivery_zone_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."delivery_zone"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_slot_id_delivery_slot_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."delivery_slot"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_assigned_butcher_id_staff_user_id_fk" FOREIGN KEY ("assigned_butcher_id") REFERENCES "public"."staff_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_assigned_driver_id_staff_user_id_fk" FOREIGN KEY ("assigned_driver_id") REFERENCES "public"."staff_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_line" ADD CONSTRAINT "order_line_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_line" ADD CONSTRAINT "order_line_variant_id_product_variant_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_line" ADD CONSTRAINT "order_line_substituted_with_variant_id_product_variant_id_fk" FOREIGN KEY ("substituted_with_variant_id") REFERENCES "public"."product_variant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_line" ADD CONSTRAINT "order_line_weighed_by_staff_id_staff_user_id_fk" FOREIGN KEY ("weighed_by_staff_id") REFERENCES "public"."staff_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_event" ADD CONSTRAINT "order_status_event_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_capture" ADD CONSTRAINT "payment_capture_payment_intent_id_payment_intent_id_fk" FOREIGN KEY ("payment_intent_id") REFERENCES "public"."payment_intent"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_intent" ADD CONSTRAINT "payment_intent_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_refund" ADD CONSTRAINT "payment_refund_payment_intent_id_payment_intent_id_fk" FOREIGN KEY ("payment_intent_id") REFERENCES "public"."payment_intent"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_refund" ADD CONSTRAINT "payment_refund_requested_by_staff_id_staff_user_id_fk" FOREIGN KEY ("requested_by_staff_id") REFERENCES "public"."staff_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "address" ADD CONSTRAINT "address_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "address" ADD CONSTRAINT "address_zone_id_delivery_zone_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."delivery_zone"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_item" ADD CONSTRAINT "stock_item_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_staff_id_staff_user_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_category_idx" ON "product" USING btree ("category_id","sort_order");--> statement-breakpoint
CREATE INDEX "product_search_idx" ON "product" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "product_occasions_idx" ON "product" USING gin ("occasions");--> statement-breakpoint
CREATE INDEX "variant_product_idx" ON "product_variant" USING btree ("product_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "variant_one_default_idx" ON "product_variant" USING btree ("product_id") WHERE "product_variant"."is_default";--> statement-breakpoint
CREATE INDEX "blackout_date_idx" ON "calendar_blackout" USING btree ("date");--> statement-breakpoint
CREATE INDEX "slot_zone_date_idx" ON "delivery_slot" USING btree ("zone_id","service_date");--> statement-breakpoint
CREATE INDEX "slot_hold_slot_idx" ON "slot_hold" USING btree ("slot_id","expires_at");--> statement-breakpoint
CREATE INDEX "notification_order_idx" ON "notification" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE INDEX "notification_queued_idx" ON "notification" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "cart_one_open_per_customer" ON "cart" USING btree ("customer_id") WHERE "cart"."status" = 'OPEN' AND "cart"."customer_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "cart_line_cart_idx" ON "cart_line" USING btree ("cart_id");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_slot_idx" ON "orders" USING btree ("slot_id");--> statement-breakpoint
CREATE INDEX "orders_customer_idx" ON "orders" USING btree ("customer_id","placed_at");--> statement-breakpoint
CREATE INDEX "order_line_order_idx" ON "order_line" USING btree ("order_id","sort_order");--> statement-breakpoint
CREATE INDEX "order_event_order_idx" ON "order_status_event" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE INDEX "payment_intent_order_idx" ON "payment_intent" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "address_customer_idx" ON "address" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "stock_movement_product_idx" ON "stock_movement" USING btree ("product_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_entity_idx" ON "audit_event" USING btree ("entity_type","entity_id","created_at");