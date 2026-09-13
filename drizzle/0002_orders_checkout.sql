CREATE TABLE "order_counter" (
	"year" integer PRIMARY KEY NOT NULL,
	"last_sequence" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mock_psp_transaction" (
	"ref" text PRIMARY KEY NOT NULL,
	"mode" text NOT NULL,
	"amount_agorot" integer NOT NULL,
	"status" text DEFAULT 'CREATED' NOT NULL,
	"scenario" text,
	"captured_agorot" integer DEFAULT 0 NOT NULL,
	"refunded_agorot" integer DEFAULT 0 NOT NULL,
	"token_ref" text,
	"card_brand" text,
	"card_last4" text,
	"decline_code" text,
	"return_url" text NOT NULL,
	"order_number" text NOT NULL,
	"locale" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "cart" ADD COLUMN "checkout_draft" jsonb;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "access_token" text NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "cart_id" uuid;--> statement-breakpoint
ALTER TABLE "staff_user" ADD COLUMN "failed_pin_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "staff_user" ADD COLUMN "locked_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_access_token_unique" UNIQUE("access_token");