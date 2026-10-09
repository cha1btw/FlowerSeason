import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";
import { sql } from "drizzle-orm";
import {
  cancelBooking,
  clearDraft,
  createSession,
  getAnalytics,
  getDraft,
  getParticipants,
  listAdminSessions,
  saveDraft,
  setSessionStatus,
  updateCapacity,
  updateSession,
} from "../lib/booking/admin-service.ts";
import { confirmPayment, createBooking } from "../lib/booking/service.ts";
import { createDb, type Db } from "../lib/db/index.ts";
import { runMigrations } from "../lib/db/migrate.ts";
import { bookings } from "../lib/db/schema.ts";

const url = process.env.TEST_DATABASE_URL;
const now = new Date("2026-11-20T10:00:00Z");
const minutes = (n: number) => new Date(now.getTime() + n * 60_000);
const days = (n: number) => minutes(n * 24 * 60);

describe("admin service", { skip: !url && "TEST_DATABASE_URL is not set" }, () => {
  let db: Db;

  before(async () => {
    await runMigrations(url!);
    db = createDb(url!, 5);
  });
  after(async () => {
    await db.$client.end();
  });
  beforeEach(async () => {
    await db.execute(sql`truncate bookings, sessions, bot_drafts`);
  });

  async function paidBooking(sessionId: string, n: number, seats: number, at: Date) {
    const created = await createBooking(
      db,
      { sessionId, name: `Guest ${n}`, phone: "+380501234567", email: `g${n}@example.com`, seats },
      at,
    );
    assert.ok(created.ok);
    await confirmPayment(db, created.booking.id, { now: at });
    return created.booking;
  }

  test("a created date starts open with the default duration", async () => {
    const session = await createSession(db, {
      startsAt: days(10),
      capacity: 8,
      priceKop: 180_000,
    });
    assert.equal(session.status, "open");
    assert.equal(session.durationMin, 120);
  });

  test("a cancelled date can never be reopened", async () => {
    const session = await createSession(db, { startsAt: days(10), capacity: 8, priceKop: 100_000 });
    assert.equal((await setSessionStatus(db, session.id, "closed"))?.status, "closed");
    assert.equal((await setSessionStatus(db, session.id, "open"))?.status, "open");
    assert.equal((await setSessionStatus(db, session.id, "cancelled"))?.status, "cancelled");
    assert.equal(await setSessionStatus(db, session.id, "open"), undefined);
  });

  test("capacity cannot drop below sold seats but can grow", async () => {
    const session = await createSession(db, { startsAt: days(10), capacity: 8, priceKop: 100_000 });
    await paidBooking(session.id, 1, 3, now);

    const tooLow = await updateCapacity(db, session.id, 2, now);
    assert.deepEqual(tooLow, { ok: false, reason: "too_low", seatsTaken: 3 });

    const exact = await updateCapacity(db, session.id, 3, now);
    assert.ok(exact.ok);
    const bigger = await updateCapacity(db, session.id, 12, now);
    assert.ok(bigger.ok);
    assert.equal(bigger.session.capacity, 12);
  });

  test("pending holds also block lowering the capacity", async () => {
    const session = await createSession(db, { startsAt: days(10), capacity: 8, priceKop: 100_000 });
    const held = await createBooking(
      db,
      { sessionId: session.id, name: "A", phone: "+380501234567", email: "a@example.com", seats: 4 },
      now,
    );
    assert.ok(held.ok);
    const result = await updateCapacity(db, session.id, 2, minutes(5));
    assert.equal(result.ok, false);
  });

  test("the schedule shows sold seats, holds and revenue, and hides cancelled and past dates", async () => {
    const open = await createSession(db, { startsAt: days(10), capacity: 8, priceKop: 100_000 });
    const cancelled = await createSession(db, { startsAt: days(11), capacity: 8, priceKop: 100_000 });
    await setSessionStatus(db, cancelled.id, "cancelled");
    await createSession(db, { startsAt: days(-1), capacity: 8, priceKop: 100_000 });

    await paidBooking(open.id, 1, 2, now);
    await createBooking(
      db,
      { sessionId: open.id, name: "B", phone: "+380501234567", email: "b@example.com", seats: 1 },
      minutes(1),
    );

    const list = await listAdminSessions(db, minutes(2));
    assert.equal(list.length, 1);
    assert.equal(list[0].paidSeats, 2);
    assert.equal(list[0].heldSeats, 1);
    assert.equal(list[0].revenueKop, 200_000);
  });

  test("participants are only paid bookings, oldest first", async () => {
    const session = await createSession(db, { startsAt: days(10), capacity: 8, priceKop: 100_000 });
    await paidBooking(session.id, 1, 1, now);
    await createBooking(
      db,
      { sessionId: session.id, name: "Unpaid", phone: "+380501234567", email: "u@example.com", seats: 1 },
      minutes(1),
    );
    await paidBooking(session.id, 2, 2, minutes(2));

    const people = await getParticipants(db, session.id);
    assert.deepEqual(people.map((p) => p.name), ["Guest 1", "Guest 2"]);
  });

  test("analytics adds up revenue, conversion and abandoned checkouts", async () => {
    const session = await createSession(db, { startsAt: days(10), capacity: 20, priceKop: 100_000 });
    await paidBooking(session.id, 1, 2, minutes(-60 * 24 * 2)); // 2 days ago, 2 000 UAH
    await paidBooking(session.id, 2, 1, minutes(-10)); // 1 000 UAH
    // Never paid and the hold ran out: abandoned.
    await createBooking(
      db,
      { sessionId: session.id, name: "Gone", phone: "+380501234567", email: "gone@example.com", seats: 1 },
      minutes(-120),
    );
    // Old payment (10 days ago): counts in totals, not in the 7-day window.
    const old = await paidBooking(session.id, 3, 1, minutes(-60 * 24 * 10));
    await db
      .update(bookings)
      .set({ paidAt: minutes(-60 * 24 * 10) })
      .where(sql`${bookings.id} = ${old.id}`);

    const a = await getAnalytics(db, now);
    assert.equal(a.paidBookings, 3);
    assert.equal(a.paidSeats, 4);
    assert.equal(a.revenueKop, 400_000);
    assert.equal(a.createdBookings, 4);
    assert.equal(a.abandonedBookings, 1);
  });

  test("the 7-day window only counts recent payments", async () => {
    const session = await createSession(db, { startsAt: days(10), capacity: 20, priceKop: 100_000 });
    const recent = await paidBooking(session.id, 1, 2, minutes(-60));
    const old = await paidBooking(session.id, 2, 1, minutes(-60));
    await db
      .update(bookings)
      .set({ paidAt: minutes(-60 * 24 * 10) })
      .where(sql`${bookings.id} = ${old.id}`);
    assert.ok(recent);

    const a = await getAnalytics(db, now);
    assert.equal(a.revenueKop, 300_000);
    assert.equal(a.last7DaysRevenueKop, 200_000);
    assert.equal(a.last7DaysSeats, 2);
    assert.equal(a.perDay.length, 1);
  });

  test("a draft is saved, replaced, cleared and expires after an hour", async () => {
    await saveDraft(db, 42, "date", {});
    assert.equal((await getDraft(db, 42))?.step, "date");

    await saveDraft(db, 42, "time", { date: { year: 2026, month: 12, day: 20 } });
    const draft = await getDraft(db, 42);
    assert.equal(draft?.step, "time");
    assert.deepEqual(draft?.data, { date: { year: 2026, month: 12, day: 20 } });

    assert.equal(await getDraft(db, 42, new Date(Date.now() + 61 * 60_000)), undefined);
    assert.equal(await getDraft(db, 42), undefined, "expired draft is deleted");

    await saveDraft(db, 7, "date", {});
    await clearDraft(db, 7);
    assert.equal(await getDraft(db, 7), undefined);
  });

  test("price, time and duration can be changed on an open date", async () => {
    const session = await createSession(db, { startsAt: days(10), capacity: 8, priceKop: 100_000 });
    const updated = await updateSession(db, session.id, {
      startsAt: days(11),
      priceKop: 150_000,
      durationMin: 90,
    });
    assert.equal(updated?.priceKop, 150_000);
    assert.equal(updated?.durationMin, 90);
    assert.equal(updated?.startsAt.getTime(), days(11).getTime());
  });

  test("a cancelled date cannot be edited", async () => {
    const session = await createSession(db, { startsAt: days(10), capacity: 8, priceKop: 100_000 });
    await setSessionStatus(db, session.id, "cancelled");
    assert.equal(await updateSession(db, session.id, { priceKop: 1 }), undefined);
  });

  test("a new price applies to new bookings only", async () => {
    const session = await createSession(db, { startsAt: days(10), capacity: 8, priceKop: 100_000 });
    const early = await paidBooking(session.id, 1, 1, now);
    await updateSession(db, session.id, { priceKop: 200_000 });
    const late = await paidBooking(session.id, 2, 1, minutes(1));

    assert.equal(early.amountKop, 100_000);
    assert.equal(late.amountKop, 200_000);
    assert.equal((await getAnalytics(db, now)).revenueKop, 300_000);
  });

  test("moving the start re-arms reminders, changing the price does not", async () => {
    const session = await createSession(db, { startsAt: days(10), capacity: 8, priceKop: 100_000 });
    const guest = await paidBooking(session.id, 1, 1, now);
    const mark = () => db.update(bookings).set({ reminderSentAt: now }).where(sql`${bookings.id} = ${guest.id}`);
    const read = async () =>
      (await db.select().from(bookings).where(sql`${bookings.id} = ${guest.id}`))[0].reminderSentAt;

    await mark();
    await updateSession(db, session.id, { priceKop: 120_000 });
    assert.ok(await read(), "price change keeps the reminder as sent");

    await updateSession(db, session.id, { startsAt: days(12) });
    assert.equal(await read(), null, "time change schedules a new reminder");
  });

  test("cancelling a booking frees the seats and removes it from revenue", async () => {
    const session = await createSession(db, { startsAt: days(10), capacity: 2, priceKop: 100_000 });
    const guest = await paidBooking(session.id, 1, 2, now);
    assert.equal((await listAdminSessions(db, minutes(1)))[0].paidSeats, 2);

    const cancelled = await cancelBooking(db, guest.id);
    assert.equal(cancelled?.status, "cancelled");
    assert.equal(await cancelBooking(db, guest.id), undefined, "second cancel does nothing");

    const [row] = await listAdminSessions(db, minutes(1));
    assert.equal(row.paidSeats, 0);
    assert.equal(row.revenueKop, 0);
    assert.equal((await getAnalytics(db, now)).revenueKop, 0);
    assert.deepEqual(await getParticipants(db, session.id), []);

    const next = await createBooking(
      db,
      { sessionId: session.id, name: "New", phone: "+380501234567", email: "new@example.com", seats: 2 },
      minutes(2),
    );
    assert.equal(next.ok, true, "the freed seats can be sold again");
  });

  test("an unpaid booking cannot be cancelled this way", async () => {
    const session = await createSession(db, { startsAt: days(10), capacity: 8, priceKop: 100_000 });
    const pending = await createBooking(
      db,
      { sessionId: session.id, name: "P", phone: "+380501234567", email: "p@example.com", seats: 1 },
      now,
    );
    assert.ok(pending.ok);
    assert.equal(await cancelBooking(db, pending.booking.id), undefined);
  });
});
