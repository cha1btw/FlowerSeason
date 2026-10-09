import assert from "node:assert/strict";
import test from "node:test";
import { formatUah, pluralSeats } from "../lib/format.ts";
import {
  formatSessionDate,
  formatSessionTime,
  formatSessionWeekday,
  kyivLocalToUtc,
} from "../lib/time.ts";
import { bookingView } from "../lib/booking/status.ts";

test("winter Kyiv time is UTC+2", () => {
  const date = kyivLocalToUtc(2026, 12, 12, 18, 0);
  assert.equal(date?.toISOString(), "2026-12-12T16:00:00.000Z");
});

test("summer Kyiv time is UTC+3", () => {
  const date = kyivLocalToUtc(2026, 7, 1, 18, 0);
  assert.equal(date?.toISOString(), "2026-07-01T15:00:00.000Z");
});

test("the offset switches on the last Sunday of March and October", () => {
  // 2026-03-29: 03:00 -> 04:00. 02:30 is still winter, 04:30 is summer.
  assert.equal(kyivLocalToUtc(2026, 3, 29, 2, 30)?.toISOString(), "2026-03-29T00:30:00.000Z");
  assert.equal(kyivLocalToUtc(2026, 3, 29, 4, 30)?.toISOString(), "2026-03-29T01:30:00.000Z");
  // 2026-10-25: 04:00 -> 03:00. 05:00 is winter again.
  assert.equal(kyivLocalToUtc(2026, 10, 25, 5, 0)?.toISOString(), "2026-10-25T03:00:00.000Z");
});

test("a time skipped by the spring clock change does not exist", () => {
  assert.equal(kyivLocalToUtc(2026, 3, 29, 3, 30), null);
});

test("impossible calendar dates are rejected", () => {
  assert.equal(kyivLocalToUtc(2026, 2, 31, 12, 0), null);
  assert.equal(kyivLocalToUtc(2026, 13, 1, 12, 0), null);
  assert.equal(kyivLocalToUtc(2026, 12, 12, 24, 30), null);
});

test("formatting round-trips through Kyiv local time", () => {
  const date = kyivLocalToUtc(2026, 12, 12, 18, 30);
  assert.ok(date);
  assert.equal(formatSessionTime(date), "18:30");
  assert.equal(formatSessionDate(date), "12 грудня");
  assert.equal(formatSessionWeekday(date), "субота");
});

test("prices are shown in hryvnias without kopecks when whole", () => {
  assert.equal(formatUah(150_000), "1\u00a0500\u00a0₴");
  assert.equal(formatUah(150_050), "1\u00a0500,50\u00a0₴");
  assert.equal(formatUah(0), "0\u00a0₴");
  assert.equal(formatUah(99_900), "999\u00a0₴");
  assert.equal(formatUah(123_456_700), "1\u00a0234\u00a0567\u00a0₴");
});

test("seat counts use the correct Ukrainian plural", () => {
  assert.equal(pluralSeats(1), "1 місце");
  assert.equal(pluralSeats(2), "2 місця");
  assert.equal(pluralSeats(4), "4 місця");
  assert.equal(pluralSeats(5), "5 місць");
  assert.equal(pluralSeats(11), "11 місць");
  assert.equal(pluralSeats(21), "21 місце");
});

test("bookingView maps database status to what the customer sees", () => {
  const now = new Date("2026-11-20T10:00:00Z");
  const future = new Date("2026-11-20T10:05:00Z");
  const past = new Date("2026-11-20T09:55:00Z");
  assert.equal(bookingView({ status: "paid", holdExpiresAt: past }, now), "paid");
  assert.equal(bookingView({ status: "pending", holdExpiresAt: future }, now), "processing");
  assert.equal(bookingView({ status: "pending", holdExpiresAt: past }, now), "expired");
  assert.equal(bookingView({ status: "failed", holdExpiresAt: future }, now), "failed");
  assert.equal(bookingView({ status: "needs_attention", holdExpiresAt: past }, now), "needs_attention");
});
