ALTER TABLE "bookings" DROP CONSTRAINT "bookings_invoice_id_unique";--> statement-breakpoint
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_status_valid";--> statement-breakpoint
-- Convert old online-payment statuses before the new constraint is added.
-- Unpaid holds and failed attempts were never confirmed; a payment that needed
-- attention was real money, so it becomes a paid booking.
UPDATE "bookings" SET "status" = 'cancelled' WHERE "status" IN ('pending', 'failed', 'expired');--> statement-breakpoint
UPDATE "bookings" SET "status" = 'paid' WHERE "status" = 'needs_attention';--> statement-breakpoint
ALTER TABLE "bookings" ALTER COLUMN "status" SET DEFAULT 'requested';--> statement-breakpoint
ALTER TABLE "bookings" DROP COLUMN "hold_expires_at";--> statement-breakpoint
ALTER TABLE "bookings" DROP COLUMN "invoice_id";--> statement-breakpoint
ALTER TABLE "bookings" DROP COLUMN "payment_url";--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_status_valid" CHECK ("bookings"."status" in ('requested', 'paid', 'cancelled'));