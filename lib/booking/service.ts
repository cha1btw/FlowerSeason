import { and, eq, gt, inArray, ne, sql } from "drizzle-orm";
import type { Db, Tx } from "../db/index.ts";
import { bookings, sessions, type Booking, type Session } from "../db/schema.ts";
import { MAX_SEATS_PER_BOOKING, seatsLeft } from "./availability.ts";

// SQL twin of holdsSeat() from availability.ts.
const holdsSeatSql = () => inArray(bookings.status, ["requested", "paid"]);

export async function seatsTakenInSession(
  tx: Pick<Db, "select"> | Tx,
  sessionId: string,
  excludeBookingId?: string,
): Promise<number> {
  const [row] = await tx
    .select({ taken: sql<number>`coalesce(sum(${bookings.seats}), 0)::int` })
    .from(bookings)
    .where(
      and(
        eq(bookings.sessionId, sessionId),
        holdsSeatSql(),
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

// Records a request and holds the seats for it.
//
// Overselling is prevented by locking the date's row (SELECT ... FOR UPDATE):
// simultaneous requests for the same date queue up behind that lock, so each
// one counts the seats only after the previous one has committed.
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

    // The same person sending the form twice must not hold two sets of seats.
    const [existing] = await tx
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.sessionId, session.id),
          eq(bookings.email, email),
          eq(bookings.status, "requested"),
        ),
      );

    if (existing) {
      if (existing.seats === seats) {
        return { ok: true, booking: existing, reused: true } as const;
      }
      // A different seat count replaces the earlier request.
      await tx
        .update(bookings)
        .set({ status: "cancelled" })
        .where(eq(bookings.id, existing.id));
    }

    const taken = await seatsTakenInSession(tx, session.id);
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
        status: "requested",
      })
      .returning();

    return { ok: true, booking, reused: false } as const;
  });
}

// The owner got the money (she sent the payment link herself) and confirms it.
// Only the call that actually changes the row returns a booking, so a double tap
// on the button cannot send two confirmation emails.
export async function markPaid(
  db: Db,
  bookingId: string,
  now: Date = new Date(),
): Promise<Booking | undefined> {
  const [booking] = await db
    .update(bookings)
    .set({ status: "paid", paidAt: now })
    .where(and(eq(bookings.id, bookingId), eq(bookings.status, "requested")))
    .returning();
  return booking;
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
      taken: sql<number>`coalesce(sum(${bookings.seats}) filter (where ${holdsSeatSql()}), 0)::int`,
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
): Promise<number> {
  return seatsLeft(session.capacity, await seatsTakenInSession(db, session.id));
}
