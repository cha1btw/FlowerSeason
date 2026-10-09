import assert from "node:assert/strict";
import test from "node:test";
import { holdsSeat, seatsLeft, seatsTaken } from "../lib/booking/availability.ts";

test("requested and paid bookings hold their seats", () => {
  assert.equal(holdsSeat({ status: "requested", seats: 2 }), true);
  assert.equal(holdsSeat({ status: "paid", seats: 2 }), true);
});

test("a cancelled booking holds nothing", () => {
  assert.equal(holdsSeat({ status: "cancelled", seats: 2 }), false);
});

test("seatsTaken sums only bookings that hold seats", () => {
  assert.equal(
    seatsTaken([
      { status: "paid", seats: 2 },
      { status: "requested", seats: 3 },
      { status: "cancelled", seats: 4 },
    ]),
    5,
  );
});

test("seatsLeft never goes below zero", () => {
  assert.equal(seatsLeft(10, 4), 6);
  assert.equal(seatsLeft(10, 12), 0);
});
