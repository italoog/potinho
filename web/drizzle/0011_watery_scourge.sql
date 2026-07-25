CREATE TABLE "urgency_countdown" (
	"id" text PRIMARY KEY DEFAULT 'main' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"duration_minutes" integer DEFAULT 167 NOT NULL,
	"label" text DEFAULT 'oferta por tempo limitado' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
