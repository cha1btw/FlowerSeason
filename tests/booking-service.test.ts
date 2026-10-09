// Needs a real Postgres: row locks cannot be tested with a mock.
//   docker compose up -d && docker compose exec db createdb -U flowerseason flowerseason_test
// TEST_DATABASE_URL lives in .env.local. Without it these tests are skipped.
import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";
import { eq, sql } from "drizzle-orm";
import { cancelBooking } from "../lib/booking/admin-service.ts";
import { announceRequest, confirmPaid } from "../lib/booking/request-events.ts";
import {
  createBooking,
  listUpcomingSessions,
  markPaid,
} from "../lib/booking/service.ts";
import { createDb, type Db } from "../lib/db/index.ts";
import { runMigrations } from "../lib/db/migrate.ts";
import { bookings, sessions } from "../lib/db/schema.ts";

const url = process.env.TEST_DATABASE_URL;
const now = new Date("2026-11-20T10:00:00Z");
const minutes = (n: number) => new Date(now.getTime() + n * 60_000);

describe("booking service", { skip: !url && "TEST_DATABASE_URL is not set" }, () => {
  let db: Db;

  before(async () => {
    await runMigrations(url!);
    // 30 connections so parallel calls really run in parallel.
    db = createDb(url!, 30);
  });

  after(async () => {
    await db.$client.end();
  });

  beforeEach(async () => {
    await db.execute(sql`truncate bookings, sessions, bot_drafts`);
  });

  async function newSession(
    capacity: number,
    overrides: Partial<typeof sessions.$inferInsert> = {},
  ) {
    const [session] = await db
      .insert(sessions)
      .values({
        startsAt: minutes(60 * 24 * 10),
        capacity,
        priceKop: 150_000,
        ...overrides,
      })
      .returning();
    return session;
  }

  const guest = (sessionId: string, n: number, seats = 1) => ({
    sessionId,
    name: `Guest ${n}`,
    phone: "+380501234567",
    email: `guest${n}@example.com`,
    seats,
  });

  test("25 parallel requests for a 10-seat date take exactly 10 seats", async () => {
    const session = await newSession(10);

    const results = await Promise.all(
      Array.from({ length: 25 }, (_, i) => createBooking(db, guest(session.id, i), now)),
    );

    assert.equal(results.filter((r) => r.ok).length, 10);
    assert.equal(results.filter((r) => !r.ok && r.reason === "sold_out").length, 15);

    const [row] = await db
      .select({ total: sql<number>`coalesce(sum(seats), 0)::int` })
      .from(bookings);
    assert.equal(row.total, 10);
  });

  test("parallel multi-seat requests never exceed capacity", async () => {
    const session = await newSession(10);

    const results = await Promise.all(
      Array.from({ length: 8 }, (_, i) => createBooking(db, guest(session.id, i, 2), now)),
    );

    assert.equal(results.filter((r) => r.ok).length, 5);
  });

  test("a new request starts as 'requested' and holds the seats with no time limit", async () => {
    const session = await newSession(1);
    const first = await createBooking(db, guest(session.id, 1), now);
    assert.ok(first.ok);
    assert.equal(first.booking.status, "requested");

    // Weeks later the seat is still held: only the owner releases it.
    const later = await createBooking(db, guest(session.id, 2), minutes(60 * 24 * 5));
    assert.equal(later.ok, false);
  });

  test("the same person sending the form twice reuses the request", async () => {
    const session = await newSession(10);

    const first = await createBooking(db, guest(session.id, 1, 2), now);
    const second = await createBooking(db, guest(session.id, 1, 2), minutes(1));

    assert.ok(first.ok && second.ok);
    assert.equal(second.reused, true);
    assert.equal(second.booking.id, first.booking.id);
  });

  test("changing the seat count replaces the earlier request instead of doubling it", async () => {
    const session = await newSession(3);

    const first = await createBooking(db, guest(session.id, 1, 3), now);
    assert.ok(first.ok);
    const changed = await createBooking(db, guest(session.id, 1, 2), minutes(1));

    assert.ok(changed.ok);
    assert.equal(changed.reused, false);
    const [old] = await db.select().from(bookings).where(eq(bookings.id, first.booking.id));
    assert.equal(old.status, "cancelled");
    const [open] = await listUpcomingSessions(db, minutes(2));
    assert.equal(open.seatsLeft, 1);
  });

  test("closed, cancelled and past dates cannot be requested", async () => {
    const closed = await newSession(5, { status: "closed" });
    const cancelled = await newSession(5, { status: "cancelled" });
    const past = await newSession(5, { startsAt: minutes(-60) });

    for (const session of [closed, cancelled, past]) {
      const result = await createBooking(db, guest(session.id, 1), now);
      assert.deepEqual(result, { ok: false, reason: "session_unavailable" });
    }
  });

  test("seat count must be between 1 and 4", async () => {
    const session = await newSession(10);
    for (const seats of [0, 5, 1.5, -1]) {
      const result = await createBooking(db, guest(session.id, 1, seats), now);
      assert.deepEqual(result, { ok: false, reason: "invalid_seats" });
    }
  });

  test("the amount to pay is price times seats", async () => {
    const session = await newSession(10, { priceKop: 120_000 });
    const result = await createBooking(db, guest(session.id, 1, 3), now);
    assert.ok(result.ok);
    assert.equal(result.booking.amountKop, 360_000);
  });

  test("markPaid confirms once even when pressed in parallel", async () => {
    const session = await newSession(10);
    const created = await createBooking(db, guest(session.id, 1), now);
    assert.ok(created.ok);

    const results = await Promise.all(
      Array.from({ length: 6 }, () => markPaid(db, created.booking.id, minutes(2))),
    );

    assert.equal(results.filter(Boolean).length, 1);
    const [row] = await db.select().from(bookings);
    assert.equal(row.status, "paid");
    assert.ok(row.paidAt);
  });

  test("a cancelled request cannot be marked paid", async () => {
    const session = await newSession(10);
    const created = await createBooking(db, guest(session.id, 1), now);
    assert.ok(created.ok);
    await cancelBooking(db, created.booking.id);
    assert.equal(await markPaid(db, created.booking.id), undefined);
  });

  test("a cancelled request frees its seats for someone else", async () => {
    const session = await newSession(1);
    const first = await createBooking(db, guest(session.id, 1), now);
    assert.ok(first.ok);
    assert.equal((await createBooking(db, guest(session.id, 2), now)).ok, false);

    await cancelBooking(db, first.booking.id);
    assert.equal((await createBooking(db, guest(session.id, 2), now)).ok, true);
  });

  test("listUpcomingSessions reports free seats and hides closed or past dates", async () => {
    const open = await newSession(10);
    await newSession(10, { status: "closed" });
    await newSession(10, { startsAt: minutes(-60) });
    const taken = await createBooking(db, guest(open.id, 1, 3), now);
    assert.ok(taken.ok);

    const list = await listUpcomingSessions(db, minutes(1));
    assert.equal(list.length, 1);
    assert.equal(list[0].id, open.id);
    assert.equal(list[0].seatsTaken, 3);
    assert.equal(list[0].seatsLeft, 7);
  });

  // ---- notifications ------------------------------------------------------

  async function withFakeNetwork<T>(run: (calls: string[], logs: string[]) => Promise<T>) {
    const logs: string[] = [];
    const calls: string[] = [];
    const originalLog = console.log;
    const originalFetch = globalThis.fetch;
    process.env.TELEGRAM_BOT_TOKEN = "test-token";
    process.env.ADMIN_TELEGRAM_IDS = "111,222";
    delete process.env.RESEND_API_KEY;
    console.log = (...args: unknown[]) => void logs.push(args.join(" "));
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push(`${String(input)} ${String(init?.body)}`);
      return new Response("{}", { status: 200 });
    }) as typeof fetch;
    try {
      return await run(calls, logs);
    } finally {
      console.log = originalLog;
      globalThis.fetch = originalFetch;
    }
  }

  test("announcing a request emails the customer and pings every admin with action buttons", async () => {
    const session = await newSession(10);
    const created = await createBooking(db, guest(session.id, 1, 2), new Date());
    assert.ok(created.ok);

    await withFakeNetwork(async (calls, logs) => {
      await announceRequest(db, created.booking.id);

      assert.equal(logs.filter((l) => l.includes("[email not configured]")).length, 1);
      assert.equal(calls.length, 2, "one Telegram message per admin");
      assert.ok(calls.every((c) => c.includes("Нова заявка")));
      assert.ok(calls.every((c) => c.includes(`bp:${created.booking.id}`)));
      assert.ok(calls.every((c) => c.includes(`bc:${created.booking.id}`)));
    });
  });

  test("confirming payment emails the customer once, however many times it is pressed", async () => {
    const session = await newSession(10);
    const created = await createBooking(db, guest(session.id, 1), new Date());
    assert.ok(created.ok);

    await withFakeNetwork(async (_calls, logs) => {
      const results = await Promise.all(
        Array.from({ length: 4 }, () => confirmPaid(db, created.booking.id)),
      );
      assert.equal(results.filter(Boolean).length, 1);
      assert.equal(logs.filter((l) => l.includes("[email not configured]")).length, 1);
    });
  });
});
