import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  bigint,
} from "drizzle-orm/pg-core";

export const SESSION_STATUSES = ["open", "closed", "cancelled"] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

// requested: the customer left a request; the seats are held until the owner
//            sends a payment link and marks it paid, or cancels it
// paid:      the owner confirmed the payment
// cancelled: declined or cancelled by the owner (a refund is done by hand)
export const BOOKING_STATUSES = ["requested", "paid", "cancelled"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    durationMin: integer("duration_min").notNull().default(120),
    capacity: integer("capacity").notNull(),
    priceKop: integer("price_kop").notNull(),
    status: text("status", { enum: SESSION_STATUSES }).notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check("sessions_capacity_positive", sql`${t.capacity} > 0`),
    check("sessions_price_non_negative", sql`${t.priceKop} >= 0`),
    check(
      "sessions_status_valid",
      sql`${t.status} in ('open', 'closed', 'cancelled')`,
    ),
    index("sessions_starts_at_idx").on(t.startsAt),
  ],
);

export const bookings = pgTable(
  "bookings",
  {
    // Public, unguessable id: it is used in the status page URL.
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    email: text("email").notNull(),
    seats: integer("seats").notNull(),
    amountKop: integer("amount_kop").notNull(),
    status: text("status", { enum: BOOKING_STATUSES }).notNull().default("requested"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check("bookings_seats_range", sql`${t.seats} between 1 and 4`),
    check("bookings_amount_non_negative", sql`${t.amountKop} >= 0`),
    check(
      "bookings_status_valid",
      sql`${t.status} in ('requested', 'paid', 'cancelled')`,
    ),
    index("bookings_session_status_idx").on(t.sessionId, t.status),
  ],
);

// State of the multi-step "new date" wizard in the Telegram bot.
// Serverless functions have no memory between requests, so it lives in the DB.
export const botDrafts = pgTable("bot_drafts", {
  chatId: bigint("chat_id", { mode: "number" }).primaryKey(),
  step: text("step").notNull(),
  data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Texts of the emails sent to customers that the owner has edited in the bot.
// A missing row means "use the built-in default" (lib/booking/email-templates.ts).
export const emailTemplates = pgTable("email_templates", {
  key: text("key").primaryKey(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Session = typeof sessions.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
