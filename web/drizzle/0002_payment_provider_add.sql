DROP INDEX "orders_stripe_session_idx";--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_provider" text DEFAULT 'mercadopago' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "provider_payment_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "orders_provider_payment_idx" ON "orders" USING btree ("provider_payment_id");