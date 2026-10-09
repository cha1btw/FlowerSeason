import assert from "node:assert/strict";
import test from "node:test";
import {
  combineStart,
  parseCapacity,
  parseDate,
  parsePriceKop,
  parseTime,
} from "../lib/bot/wizard.ts";

const october = { year: 2026, month: 10, day: 10 };
const december = { year: 2026, month: 12, day: 10 };

test("a date without a year means its next occurrence", () => {
  assert.deepEqual(parseDate("20.12", october), { year: 2026, month: 12, day: 20 });
  assert.deepEqual(parseDate("05.01", december), { year: 2027, month: 1, day: 5 });
  assert.deepEqual(parseDate("10.12", december), { year: 2026, month: 12, day: 10 });
  assert.deepEqual(parseDate("09.12", december), { year: 2027, month: 12, day: 9 });
});

test("dates accept several separators and two- or four-digit years", () => {
  assert.deepEqual(parseDate("20/12", october), { year: 2026, month: 12, day: 20 });
  assert.deepEqual(parseDate("20-12-2027", october), { year: 2027, month: 12, day: 20 });
  assert.deepEqual(parseDate("20 12 27", october), { year: 2027, month: 12, day: 20 });
});

test("impossible or malformed dates are rejected", () => {
  for (const bad of ["31.02", "32.12", "20.13", "abc", "", "20", "20.12.20.1"]) {
    assert.equal(parseDate(bad, october), null, bad);
  }
});

test("times accept common spellings and reject nonsense", () => {
  assert.deepEqual(parseTime("18:00"), { hour: 18, minute: 0 });
  assert.deepEqual(parseTime("9:30"), { hour: 9, minute: 30 });
  assert.deepEqual(parseTime("18.45"), { hour: 18, minute: 45 });
  assert.deepEqual(parseTime("1800"), { hour: 18, minute: 0 });
  for (const bad of ["24:00", "18:60", "abc", "", "18:0"]) {
    assert.equal(parseTime(bad), null, bad);
  }
});

test("capacity is a whole number from 1 to 50", () => {
  assert.equal(parseCapacity("8"), 8);
  assert.equal(parseCapacity(" 50 "), 50);
  for (const bad of ["0", "51", "-1", "1.5", "abc", ""]) {
    assert.equal(parseCapacity(bad), null, bad);
  }
});

test("prices become kopecks and tolerate spaces, commas and dots", () => {
  assert.equal(parsePriceKop("1800"), 180_000);
  assert.equal(parsePriceKop("1 800"), 180_000);
  assert.equal(parsePriceKop("1800,5"), 180_050);
  assert.equal(parsePriceKop("1800.50"), 180_050);
  assert.equal(parsePriceKop("100000"), 10_000_000);
});

test("unreasonable prices are rejected", () => {
  for (const bad of ["0", "0.50", "100001", "-5", "abc", "1800.555", ""]) {
    assert.equal(parsePriceKop(bad), null, bad);
  }
});

test("combineStart rejects past times and times skipped by the clock change", () => {
  const now = new Date("2026-10-10T10:00:00Z");
  const ok = combineStart({ year: 2026, month: 12, day: 20 }, { hour: 18, minute: 0 }, now);
  assert.ok(ok.ok);
  assert.equal(ok.startsAt.toISOString(), "2026-12-20T16:00:00.000Z");

  const past = combineStart({ year: 2026, month: 10, day: 9 }, { hour: 18, minute: 0 }, now);
  assert.deepEqual(past, { ok: false, reason: "past" });

  const gap = combineStart({ year: 2027, month: 3, day: 28 }, { hour: 3, minute: 30 }, now);
  assert.deepEqual(gap, { ok: false, reason: "nonexistent" });
});
