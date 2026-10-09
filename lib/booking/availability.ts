import type { BookingStatus } from "../db/schema.ts";

export const MAX_SEATS_PER_BOOKING = 4;

export type SeatHolder = { status: BookingStatus; seats: number };

// A request holds its seats from the moment it is made until the owner cancels
// it; a paid booking holds them for good. Cancelled ones hold nothing.
// lib/booking/service.ts mirrors this rule in SQL (holdsSeatSql): keep them in sync.
export function holdsSeat(booking: SeatHolder): boolean {
  return booking.status === "requested" || booking.status === "paid";
}

export function seatsTaken(bookings: SeatHolder[]): number {
  return bookings.reduce(
    (sum, booking) => sum + (holdsSeat(booking) ? booking.seats : 0),
    0,
  );
}

export function seatsLeft(capacity: number, taken: number): number {
  return Math.max(0, capacity - taken);
}
