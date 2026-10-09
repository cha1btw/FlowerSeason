import assert from "node:assert/strict";
import test from "node:test";
import {
  HOLD_MINUTES,
  holdExpiry,
  holdsSeat,
  seatsLeft,
  seatsTaken,
  type SeatHolder,
} from "../lib/booking/availability.ts";

const now = new Date("2026-11-20T10:00:00Z");
const minutes = (n: number) => new Date(now.getTime() + n * 60_000);

const booking = (
  status: SeatHolder["status"],
  seats: number,
  holdMinutes: number,
): SeatHolder => ({ status, seats, holdExpiresAt: minutes(holdMinutes) });

test("paid and needs_attention bookings always hold their seats", () => {
  assert.equal(holdsSeat(booking("paid", 2, -999), now), true);
  assert.equal(holdsSeat(booking("needs_attention", 1, -999), now), true);
});

test("a pending booking holds seats only until its hold expires", () => {
  assert.equal(holdsSeat(booking("pending", 2, 5), now), true);
  assert.equal(holdsSeat(booking("pending", 2, 0), now), false);
  assert.equal(holdsSeat(booking("pending", 2, -1), now), false);
});

test("failed and expired bookings never hold seats", () => {
  assert.equal(holdsSeat(booking("failed", 2, 60), now), false);
  assert.equal(holdsSeat(booking("expired", 2, 60), now), false);
});

test("seatsTaken sums only bookings that hold seats", () => {
  const all = [
    booking("paid", 2, -100),
    booking("pending", 3, 5),
    booking("pending", 4, -5),
    booking("failed", 1, 5),
  ];
  assert.equal(seatsTaken(all, now), 5);
});

test("seatsLeft never goes below zero", () => {
  assert.equal(seatsLeft(10, 4), 6);
  assert.equal(seatsLeft(10, 12), 0);
});

test("holdExpiry adds the hold duration", () => {
  assert.equal(
    holdExpiry(now).getTime() - now.getTime(),
    HOLD_MINUTES * 60_000,
  );
});
