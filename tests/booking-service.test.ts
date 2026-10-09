// Needs a real Postgres: row locks cannot be tested with a mock.
//   docker compose up -d && docker compose exec db createdb -U flowerseason flowerseason_test
// TEST_DATABASE_URL lives in .env.local. Without it these tests are skipped.
import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";
import { sql } from "drizzle-orm";
import { createDb, type Db } from "../lib/db/index.ts";
import { runMigrations } from "../lib/db/migrate.ts";
import { bookings, sessions } from "../lib/db/schema.ts";
import { applySuccessfulPayment } from "../lib/booking/payment-events.ts";
import {
  attachInvoice,
  confirmPayment,
  createBooking,
  listUpcomingSessions,
  markFailed,
} from "../lib/booking/service.ts";

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

  const buyer = (sessionId: string, n: number, seats = 1) => ({
    sessionId,
    name: `Buyer ${n}`,
    phone: "+380501234567",
    email: `buyer${n}@example.com`,
    seats,
  });

  test("25 parallel purchases of a 10-seat date sell exactly 10 seats", async () => {
    const session = await newSession(10);

    const results = await Promise.all(
      Array.from({ length: 25 }, (_, i) =>
        createBooking(db, buyer(session.id, i), now),
      ),
    );

    assert.equal(results.filter((r) => r.ok).length, 10);
    const soldOut = results.filter((r) => !r.ok && r.reason === "sold_out");
    assert.equal(soldOut.length, 15);

    const [row] = await db
      .select({ total: sql<number>`coalesce(sum(seats), 0)::int` })
      .from(bookings);
    assert.equal(row.total, 10);
  });

  test("parallel multi-seat purchases never exceed capacity", async () => {
    const session = await newSession(10);

    const results = await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        createBooking(db, buyer(session.id, i, 2), now),
      ),
    );

    assert.equal(results.filter((r) => r.ok).length, 5);
  });

  test("an expired hold frees its seats", async () => {
    const session = await newSession(1);

    const first = await createBooking(db, buyer(session.id, 1), now);
    assert.equal(first.ok, true);
    const blocked = await createBooking(db, buyer(session.id, 2), minutes(14));
    assert.equal(blocked.ok, false);

    const later = await createBooking(db, buyer(session.id, 2), minutes(16));
    assert.equal(later.ok, true);
  });

  test("the same person pressing pay twice reuses the existing booking", async () => {
    const session = await newSession(10);

    const first = await createBooking(db, buyer(session.id, 1, 2), now);
    const second = await createBooking(db, buyer(session.id, 1, 2), minutes(1));

    assert.ok(first.ok && second.ok);
    assert.equal(second.reused, true);
    assert.equal(second.booking.id, first.booking.id);
  });

  test("changing the seat count retires the old hold instead of doubling it", async () => {
    const session = await newSession(3);

    await createBooking(db, buyer(session.id, 1, 3), now);
    const changed = await createBooking(db, buyer(session.id, 1, 2), minutes(1));

    assert.ok(changed.ok);
    assert.equal(changed.reused, false);
    const [open] = await listUpcomingSessions(db, minutes(2));
    assert.equal(open.seatsLeft, 1);
  });

  test("closed, cancelled and past dates cannot be booked", async () => {
    const closed = await newSession(5, { status: "closed" });
    const cancelled = await newSession(5, { status: "cancelled" });
    const past = await newSession(5, { startsAt: minutes(-60) });

    for (const session of [closed, cancelled, past]) {
      const result = await createBooking(db, buyer(session.id, 1), now);
      assert.deepEqual(result, { ok: false, reason: "session_unavailable" });
    }
  });

  test("seat count must be between 1 and 4", async () => {
    const session = await newSession(10);
    for (const seats of [0, 5, 1.5, -1]) {
      const result = await createBooking(db, buyer(session.id, 1, seats), now);
      assert.deepEqual(result, { ok: false, reason: "invalid_seats" });
    }
  });

  test("the amount is price times seats", async () => {
    const session = await newSession(10, { priceKop: 120_000 });
    const result = await createBooking(db, buyer(session.id, 1, 3), now);
    assert.ok(result.ok);
    assert.equal(result.booking.amountKop, 360_000);
  });

  test("confirmPayment confirms once even when called in parallel", async () => {
    const session = await newSession(10);
    const created = await createBooking(db, buyer(session.id, 1), now);
    assert.ok(created.ok);

    const results = await Promise.all(
      Array.from({ length: 6 }, () =>
        confirmPayment(db, created.booking.id, {
          paidAmountKop: 150_000,
          now: minutes(2),
        }),
      ),
    );

    assert.equal(results.filter((r) => r.kind === "confirmed").length, 1);
    assert.equal(results.filter((r) => r.kind === "unchanged").length, 5);
    const confirmed = results.find((r) => r.kind === "confirmed");
    assert.ok(confirmed && confirmed.kind === "confirmed");
    assert.equal(confirmed.outcome, "paid");
    assert.equal(confirmed.booking.status, "paid");
  });

  test("a payment with the wrong amount is not confirmed", async () => {
    const session = await newSession(10);
    const created = await createBooking(db, buyer(session.id, 1), now);
    assert.ok(created.ok);

    const result = await confirmPayment(db, created.booking.id, {
      paidAmountKop: 100,
      now,
    });
    assert.equal(result.kind, "amount_mismatch");
  });

  test("a late payment after the seat was resold needs attention", async () => {
    const session = await newSession(1);
    const first = await createBooking(db, buyer(session.id, 1), now);
    assert.ok(first.ok);
    // The hold runs out and someone else takes the only seat.
    const second = await createBooking(db, buyer(session.id, 2), minutes(20));
    assert.ok(second.ok);

    const late = await confirmPayment(db, first.booking.id, { now: minutes(21) });
    assert.ok(late.kind === "confirmed");
    assert.equal(late.outcome, "needs_attention");
  });

  test("a late payment is fine when the seat is still free", async () => {
    const session = await newSession(1);
    const first = await createBooking(db, buyer(session.id, 1), now);
    assert.ok(first.ok);

    const late = await confirmPayment(db, first.booking.id, { now: minutes(20) });
    assert.ok(late.kind === "confirmed");
    assert.equal(late.outcome, "paid");
  });

  test("a payment for a cancelled date needs attention", async () => {
    const session = await newSession(5);
    const created = await createBooking(db, buyer(session.id, 1), now);
    assert.ok(created.ok);
    await db.update(sessions).set({ status: "cancelled" });

    const result = await confirmPayment(db, created.booking.id, { now: minutes(1) });
    assert.ok(result.kind === "confirmed");
    assert.equal(result.outcome, "needs_attention");
  });

  test("confirmPayment on an unknown booking reports not_found", async () => {
    const result = await confirmPayment(db, "00000000-0000-0000-0000-000000000000");
    assert.equal(result.kind, "not_found");
  });

  test("markFailed releases the seats and only affects pending bookings", async () => {
    const session = await newSession(1);
    const first = await createBooking(db, buyer(session.id, 1), now);
    assert.ok(first.ok);

    const failed = await markFailed(db, first.booking.id);
    assert.equal(failed?.status, "failed");
    assert.equal(await markFailed(db, first.booking.id), undefined);

    const next = await createBooking(db, buyer(session.id, 2), minutes(1));
    assert.equal(next.ok, true);
  });

  test("attachInvoice stores the invoice only once", async () => {
    const session = await newSession(5);
    const created = await createBooking(db, buyer(session.id, 1), now);
    assert.ok(created.ok);

    assert.equal(await attachInvoice(db, created.booking.id, "inv-1", "https://pay/1"), true);
    assert.equal(await attachInvoice(db, created.booking.id, "inv-2", "https://pay/2"), false);
  });

  test("listUpcomingSessions reports free seats and hides closed or past dates", async () => {
    const open = await newSession(10);
    await newSession(10, { status: "closed" });
    await newSession(10, { startsAt: minutes(-60) });
    await createBooking(db, buyer(open.id, 1, 3), now);

    const list = await listUpcomingSessions(db, minutes(1));
    assert.equal(list.length, 1);
    assert.equal(list[0].id, open.id);
    assert.equal(list[0].seatsTaken, 3);
    assert.equal(list[0].seatsLeft, 7);
  });

  test("applySuccessfulPayment emails the customer and alerts the owner exactly once", async () => {
    const session = await newSession(10);
    const created = await createBooking(db, buyer(session.id, 1, 2), new Date());
    assert.ok(created.ok);

    const logs: string[] = [];
    const originalLog = console.log;
    const originalFetch = globalThis.fetch;
    const telegramCalls: string[] = [];
    process.env.TELEGRAM_BOT_TOKEN = "test-token";
    process.env.ADMIN_TELEGRAM_IDS = "111,222";
    delete process.env.RESEND_API_KEY;
    console.log = (...args: unknown[]) => void logs.push(args.join(" "));
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      telegramCalls.push(`${String(input)} ${String(init?.body)}`);
      return new Response("{}", { status: 200 });
    }) as typeof fetch;

    try {
      await Promise.all(
        Array.from({ length: 4 }, () =>
          applySuccessfulPayment(db, created.booking.id, 300_000),
        ),
      );
    } finally {
      console.log = originalLog;
      globalThis.fetch = originalFetch;
    }

    // One email attempt (logged because Resend is not configured) ...
    assert.equal(logs.filter((line) => line.includes("[email not configured]")).length, 1);
    // ... and one Telegram message per admin, not per retry.
    assert.equal(telegramCalls.length, 2);
    assert.ok(telegramCalls.every((call) => call.includes("Нова оплата")));
  });

  test("a payment that arrives too late for the seat alerts the owner and does not email the customer", async () => {
    const session = await newSession(1);
    const early = new Date(Date.now() - 60 * 60_000);
    const first = await createBooking(db, buyer(session.id, 1), early);
    assert.ok(first.ok);
    const second = await createBooking(db, buyer(session.id, 2), new Date());
    assert.ok(second.ok);

    const logs: string[] = [];
    const originalLog = console.log;
    const originalFetch = globalThis.fetch;
    const telegramCalls: string[] = [];
    process.env.TELEGRAM_BOT_TOKEN = "test-token";
    process.env.ADMIN_TELEGRAM_IDS = "111";
    console.log = (...args: unknown[]) => void logs.push(args.join(" "));
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      telegramCalls.push(`${String(input)} ${String(init?.body)}`);
      return new Response("{}", { status: 200 });
    }) as typeof fetch;

    try {
      const result = await applySuccessfulPayment(db, first.booking.id, 150_000);
      assert.ok(result.kind === "confirmed");
      assert.equal(result.outcome, "needs_attention");
    } finally {
      console.log = originalLog;
      globalThis.fetch = originalFetch;
    }

    assert.equal(logs.filter((line) => line.includes("[email not configured]")).length, 0);
    assert.equal(telegramCalls.length, 1);
    assert.match(telegramCalls[0], /Потрібна ваша увага/);
  });
});
