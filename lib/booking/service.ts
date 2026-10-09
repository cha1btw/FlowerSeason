import { and, eq, gt, inArray, ne, or, sql } from "drizzle-orm";
import type { Db, Tx } from "../db/index.ts";
import { bookings, sessions, type Booking, type Session } from "../db/schema.ts";
import { MAX_SEATS_PER_BOOKING, holdExpiry, seatsLeft } from "./availability.ts";

// SQL twin of holdsSeat() from availability.ts.
function holdsSeatSql(now: Date) {
  return or(
    inArray(bookings.status, ["paid", "needs_attention"]),
    and(eq(bookings.status, "pending"), gt(bookings.holdExpiresAt, now)),
  );
}

export async function seatsTakenInSession(
  tx: Pick<Db, "select"> | Tx,
  sessionId: string,
  now: Date,
  excludeBookingId?: string,
): Promise<number> {
  const [row] = await tx
    .select({ taken: sql<number>`coalesce(sum(${bookings.seats}), 0)::int` })
    .from(bookings)
    .where(
      and(
        eq(bookings.sessionId, sessionId),
        holdsSeatSql(now),
        excludeBookingId ? ne(bookings.id, excludeBookingId) : undefined,
      ),
    );
  return row.taken;
}

export type CreateBookingInput = {
  sessionId: string;
  name: string;
  phone: string;
  email: string;
  seats: number;
};

export type CreateBookingResult =
  | { ok: true; booking: Booking; reused: boolean }
  | {
      ok: false;
      reason: "invalid_seats" | "session_unavailable" | "sold_out";
      seatsLeft?: number;
    };

// Creates a "pending" booking that holds the seats for HOLD_MINUTES.
//
// Overselling is prevented by locking the session row (SELECT ... FOR UPDATE):
// concurrent purchases of the same date queue up behind that lock, so each one
// counts the seats only after the previous one has committed. The payment
// provider is NOT called inside this transaction, so the lock is held for
// milliseconds only.
export async function createBooking(
  db: Db,
  input: CreateBookingInput,
  now: Date = new Date(),
): Promise<CreateBookingResult> {
  const { seats } = input;
  if (!Number.isInteger(seats) || seats < 1 || seats > MAX_SEATS_PER_BOOKING) {
    return { ok: false, reason: "invalid_seats" };
  }
  const email = input.email.trim().toLowerCase();

  return db.transaction(async (tx) => {
    const [session] = await tx
      .select()
      .from(sessions)
      .where(eq(sessions.id, input.sessionId))
      .for("update");

    if (
      !session ||
      session.status !== "open" ||
      session.startsAt.getTime() <= now.getTime()
    ) {
      return { ok: false, reason: "session_unavailable" } as const;
    }

    // The same person pressing "pay" twice must not lock two sets of seats.
    const [existing] = await tx
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.sessionId, session.id),
          eq(bookings.email, email),
          eq(bookings.status, "pending"),
          gt(bookings.holdExpiresAt, now),
        ),
      );

    if (existing) {
      if (existing.seats === seats) {
        return { ok: true, booking: existing, reused: true } as const;
      }
      // Different seat count: retire the old hold. It becomes "expired" (not
      // "failed") because its invoice may still be paid later; such a payment
      // is then re-checked against the free seats in confirmPayment().
      await tx
        .update(bookings)
        .set({ status: "expired", holdExpiresAt: now })
        .where(eq(bookings.id, existing.id));
    }

    const taken = await seatsTakenInSession(tx, session.id, now);
    if (taken + seats > session.capacity) {
      return {
        ok: false,
        reason: "sold_out",
        seatsLeft: seatsLeft(session.capacity, taken),
      } as const;
    }

    const [booking] = await tx
      .insert(bookings)
      .values({
        sessionId: session.id,
        name: input.name,
        phone: input.phone,
        email,
        seats,
        amountKop: session.priceKop * seats,
        status: "pending",
        holdExpiresAt: holdExpiry(now),
      })
      .returning();

    return { ok: true, booking, reused: false } as const;
  });
}

// Stores the payment provider's invoice on the booking. Returns false when the
// booking already has an invoice (another request got there first).
export async function attachInvoice(
  db: Db,
  bookingId: string,
  invoiceId: string,
  paymentUrl: string,
): Promise<boolean> {
  const rows = await db
    .update(bookings)
    .set({ invoiceId, paymentUrl })
    .where(and(eq(bookings.id, bookingId), sql`${bookings.invoiceId} is null`))
    .returning({ id: bookings.id });
  return rows.length > 0;
}

// Releases the seats of a pending booking whose payment definitely did not
// happen (invoice could not be created, or the provider reported a failure).
export async function markFailed(
  db: Db,
  bookingId: string,
): Promise<Booking | undefined> {
  const [booking] = await db
    .update(bookings)
    .set({ status: "failed" })
    .where(and(eq(bookings.id, bookingId), eq(bookings.status, "pending")))
    .returning();
  return booking;
}

export type ConfirmPaymentResult =
  | { kind: "confirmed"; booking: Booking; outcome: "paid" | "needs_attention" }
  | { kind: "unchanged"; booking: Booking }
  | { kind: "amount_mismatch"; booking: Booking }
  | { kind: "not_found" };

// Marks a booking as paid. Idempotent: only the call that actually changes the
// row returns kind "confirmed", so only that call sends emails/notifications,
// no matter how many times the provider retries its webhook or the status page
// polls in parallel.
//
// If the hold had already run out, the seats may have been sold to someone else
// in the meantime. Then the money has arrived but there is no free seat: the
// booking becomes "needs_attention" and the owner decides (refund or squeeze in).
export async function confirmPayment(
  db: Db,
  bookingId: string,
  options: { paidAmountKop?: number; now?: Date } = {},
): Promise<ConfirmPaymentResult> {
  const now = options.now ?? new Date();

  return db.transaction(async (tx) => {
    const [peek] = await tx
      .select({ sessionId: bookings.sessionId })
      .from(bookings)
      .where(eq(bookings.id, bookingId));
    if (!peek) return { kind: "not_found" } as const;

    // Lock order is always session first, then booking, to avoid deadlocks
    // with createBooking().
    const [session] = await tx
      .select()
      .from(sessions)
      .where(eq(sessions.id, peek.sessionId))
      .for("update");
    const [booking] = await tx
      .select()
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .for("update");

    if (booking.status !== "pending" && booking.status !== "expired") {
      return { kind: "unchanged", booking } as const;
    }
    if (
      options.paidAmountKop !== undefined &&
      options.paidAmountKop !== booking.amountKop
    ) {
      return { kind: "amount_mismatch", booking } as const;
    }

    const holdStillActive =
      booking.status === "pending" &&
      booking.holdExpiresAt.getTime() > now.getTime();

    let outcome: "paid" | "needs_attention" = "paid";
    if (session.status === "cancelled") {
      outcome = "needs_attention";
    } else if (!holdStillActive) {
      const taken = await seatsTakenInSession(tx, session.id, now, booking.id);
      if (taken + booking.seats > session.capacity) outcome = "needs_attention";
    }

    const [updated] = await tx
      .update(bookings)
      .set({ status: outcome, paidAt: now })
      .where(eq(bookings.id, bookingId))
      .returning();

    return { kind: "confirmed", booking: updated, outcome } as const;
  });
}

export type SessionWithAvailability = Session & {
  seatsTaken: number;
  seatsLeft: number;
};

// Open, upcoming dates with the number of free seats, for the public page.
export async function listUpcomingSessions(
  db: Db,
  now: Date = new Date(),
): Promise<SessionWithAvailability[]> {
  const rows = await db
    .select({
      session: sessions,
      taken: sql<number>`coalesce(sum(${bookings.seats}) filter (where ${holdsSeatSql(now)}), 0)::int`,
    })
    .from(sessions)
    .leftJoin(bookings, eq(bookings.sessionId, sessions.id))
    .where(and(eq(sessions.status, "open"), gt(sessions.startsAt, now)))
    .groupBy(sessions.id)
    .orderBy(sessions.startsAt);

  return rows.map(({ session, taken }) => ({
    ...session,
    seatsTaken: taken,
    seatsLeft: seatsLeft(session.capacity, taken),
  }));
}

export type BookingWithSession = { booking: Booking; session: Session };

export async function getBookingWithSession(
  db: Db,
  bookingId: string,
): Promise<BookingWithSession | undefined> {
  const [row] = await db
    .select({ booking: bookings, session: sessions })
    .from(bookings)
    .innerJoin(sessions, eq(sessions.id, bookings.sessionId))
    .where(eq(bookings.id, bookingId));
  return row;
}

export async function getSeatsLeft(
  db: Db,
  session: Pick<Session, "id" | "capacity">,
  now: Date = new Date(),
): Promise<number> {
  return seatsLeft(session.capacity, await seatsTakenInSession(db, session.id, now));
}
