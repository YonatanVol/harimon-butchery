CREATE TABLE "mock_psp_operation" (
	"idempotency_key" text PRIMARY KEY NOT NULL,
	"result" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
