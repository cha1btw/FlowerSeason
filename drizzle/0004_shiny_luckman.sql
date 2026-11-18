ALTER TABLE "bookings" DROP CONSTRAINT "bookings_seats_range";--> statement-breakpoint
ALTER TABLE "bookings" ALTER COLUMN "email" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "messenger" text DEFAULT 'Telegram' NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "comment" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "title" text DEFAULT 'РІЗДВЯНИЙ ВІНОК' NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "location" text DEFAULT 'Matilda · провулок Чеховський, 4, Київ' NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_seats_range" CHECK ("bookings"."seats" between 1 and 10);