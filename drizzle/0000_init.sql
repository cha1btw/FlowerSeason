CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text NOT NULL,
	"seats" integer NOT NULL,
	"amount_kop" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"hold_expires_at" timestamp with time zone NOT NULL,
	"invoice_id" text,
	"payment_url" text,
	"paid_at" timestamp with time zone,
	"reminder_sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_invoice_id_unique" UNIQUE("invoice_id"),
	CONSTRAINT "bookings_seats_range" CHECK ("bookings"."seats" between 1 and 4),
	CONSTRAINT "bookings_amount_non_negative" CHECK ("bookings"."amount_kop" >= 0),
	CONSTRAINT "bookings_status_valid" CHECK ("bookings"."status" in ('pending', 'paid', 'failed', 'expired', 'needs_attention'))
);
--> statement-breakpoint
CREATE TABLE "bot_drafts" (
	"chat_id" bigint PRIMARY KEY NOT NULL,
	"step" text NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"duration_min" integer DEFAULT 120 NOT NULL,
	"capacity" integer NOT NULL,
	"price_kop" integer NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_capacity_positive" CHECK ("sessions"."capacity" > 0),
	CONSTRAINT "sessions_price_non_negative" CHECK ("sessions"."price_kop" >= 0),
	CONSTRAINT "sessions_status_valid" CHECK ("sessions"."status" in ('open', 'closed', 'cancelled'))
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bookings_session_status_idx" ON "bookings" USING btree ("session_id","status");--> statement-breakpoint
CREATE INDEX "sessions_starts_at_idx" ON "sessions" USING btree ("starts_at");