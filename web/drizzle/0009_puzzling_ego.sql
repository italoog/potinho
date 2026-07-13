ALTER TABLE "orders" ADD COLUMN "recipient_document" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "shipping_order_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "shipping_label_url" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "shipping_label_price_cents" integer;