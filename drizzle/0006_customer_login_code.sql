CREATE TABLE "customer_login_code" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone_e164" text NOT NULL,
	"code_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_login_code_attempts" CHECK ("customer_login_code"."attempts" >= 0)
);
--> statement-breakpoint
CREATE INDEX "customer_login_code_phone_idx" ON "customer_login_code" USING btree ("phone_e164","created_at");