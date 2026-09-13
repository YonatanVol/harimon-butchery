ALTER TABLE "orders" ADD COLUMN "extra_charged_agorot" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "approval_deadline_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "order_line" ADD COLUMN "pending_actual_g" integer;