import type { BookingStatus } from "../db/schema.ts";

export const HOLD_MINUTES = 15;
export const MAX_SEATS_PER_BOOKING = 4;

export type SeatHolder = {
  status: BookingStatus;
  seats: number;
  holdExpiresAt: Date;
};

// A booking occupies seats when it is paid (or paid-but-oversold, which the
// owner still has to resolve by hand) or when it is a pending booking whose
// 15-minute hold has not run out yet. An expired hold simply stops counting,
// so no background job is needed to release seats.
// lib/booking/service.ts mirrors this rule in SQL (holdsSeatSql): keep them in sync.
export function holdsSeat(booking: SeatHolder, now: Date): boolean {
  switch (booking.status) {
    case "paid":
    case "needs_attention":
      return true;
    case "pending":
      return booking.holdExpiresAt.getTime() > now.getTime();
    default:
      return false;
  }
}

export function seatsTaken(bookings: SeatHolder[], now: Date): number {
  return bookings.reduce(
    (sum, booking) => sum + (holdsSeat(booking, now) ? booking.seats : 0),
    0,
  );
}

export function seatsLeft(capacity: number, taken: number): number {
  return Math.max(0, capacity - taken);
}

export function holdExpiry(now: Date): Date {
  return new Date(now.getTime() + HOLD_MINUTES * 60_000);
}
