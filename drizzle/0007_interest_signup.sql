CREATE TABLE "interest_signup" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"subject" text NOT NULL,
	"phone_e164" text NOT NULL,
	"locale" text DEFAULT 'he' NOT NULL,
	"notified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "interest_signup_kind" CHECK ("interest_signup"."kind" IN ('RESTOCK', 'AREA')),
	CONSTRAINT "interest_signup_locale" CHECK ("interest_signup"."locale" IN ('he', 'en'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "interest_signup_unique" ON "interest_signup" USING btree ("kind","subject","phone_e164");--> statement-breakpoint
CREATE INDEX "interest_signup_pending_idx" ON "interest_signup" USING btree ("kind","subject","notified_at");