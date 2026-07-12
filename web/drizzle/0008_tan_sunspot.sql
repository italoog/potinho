ALTER TABLE "coupons" ADD COLUMN "usage_limit" integer;--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "usage_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "expires_at" timestamp with time zone;