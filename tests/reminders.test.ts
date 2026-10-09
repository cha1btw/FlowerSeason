import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";
import { eq, sql } from "drizzle-orm";
import { createSession, setSessionStatus } from "../lib/booking/admin-service.ts";
import { sendDueReminders } from "../lib/booking/reminders.ts";
import { confirmPayment, createBooking } from "../lib/booking/service.ts";
import { createDb, type Db } from "../lib/db/index.ts";
import { runMigrations } from "../lib/db/migrate.ts";
import { bookings } from "../lib/db/schema.ts";

const url = process.env.TEST_DATABASE_URL;
const now = new Date("2026-12-19T07:00:00Z");
const hours = (n: number) => new Date(now.getTime() + n * 60 * 60_000);

describe("reminders", { skip: !url && "TEST_DATABASE_URL is not set" }, () => {
  let db: Db;
  let emails: string[];
  let restore: () => void;

  before(async () => {
    await runMigrations(url!);
    db = createDb(url!, 5);
  });
  after(async () => {
    await db.$client.end();
  });

  beforeEach(async () => {
    await db.execute(sql`truncate bookings, sessions, bot_drafts`);
    emails = [];
    delete process.env.TELEGRAM_BOT_TOKEN;
    const originalLog = console.log;
    console.log = (...args: unknown[]) => void emails.push(args.join(" "));
    restore = () => {
      console.log = originalLog;
    };
  });

  const reminderLines = () => emails.filter((line) => line.includes("[email not configured]"));

  async function paid(sessionId: string, n: number) {
    const created = await createBooking(
      db,
      { sessionId, name: `G${n}`, phone: "+380501234567", email: `g${n}@example.com`, seats: 1 },
      hours(-48),
    );
    assert.ok(created.ok);
    await confirmPayment(db, created.booking.id, { now: hours(-47) });
    return created.booking;
  }

  const sentAt = async (id: string) =>
    (await db.select().from(bookings).where(eq(bookings.id, id)))[0].reminderSentAt;

  test("only paid guests of classes starting within 36 hours are reminded, and only once", async () => {
    const soon = await createSession(db, { startsAt: hours(20), capacity: 8, priceKop: 100_000 });
    const later = await createSession(db, { startsAt: hours(60), capacity: 8, priceKop: 100_000 });
    const past = await createSession(db, { startsAt: hours(-2), capacity: 8, priceKop: 100_000 });

    const a = await paid(soon.id, 1);
    const b = await paid(soon.id, 2);
    const farAway = await paid(later.id, 3);
    const gone = await paid(past.id, 4);
    // A guest who never paid must not get a reminder.
    await createBooking(
      db,
      { sessionId: soon.id, name: "Unpaid", phone: "+380501234567", email: "u@example.com", seats: 1 },
      hours(-1),
    );

    try {
      const first = await sendDueReminders(db, now);
      assert.deepEqual(first, { sent: 0, failed: 2 }, "email is not configured in tests");
    } finally {
      restore();
    }
    assert.equal(reminderLines().length, 2);
    assert.equal(await sentAt(farAway.id), null);
    assert.equal(await sentAt(gone.id), null);
    assert.equal(await sentAt(a.id), null, "a failed send is released for the next run");
    assert.equal(await sentAt(b.id), null);
  });

  test("a delivered reminder is never sent again", async () => {
    const session = await createSession(db, { startsAt: hours(20), capacity: 8, priceKop: 100_000 });
    const booking = await paid(session.id, 1);

    // Simulate a successful first send.
    await db.update(bookings).set({ reminderSentAt: now }).where(eq(bookings.id, booking.id));

    try {
      const summary = await sendDueReminders(db, now);
      assert.deepEqual(summary, { sent: 0, failed: 0 });
    } finally {
      restore();
    }
    assert.equal(reminderLines().length, 0);
  });

  test("a cancelled class sends no reminders", async () => {
    const session = await createSession(db, { startsAt: hours(20), capacity: 8, priceKop: 100_000 });
    await paid(session.id, 1);
    await setSessionStatus(db, session.id, "cancelled");

    try {
      const summary = await sendDueReminders(db, now);
      assert.deepEqual(summary, { sent: 0, failed: 0 });
    } finally {
      restore();
    }
    assert.equal(reminderLines().length, 0);
  });

  test("two overlapping runs send each reminder once", async () => {
    const session = await createSession(db, { startsAt: hours(20), capacity: 8, priceKop: 100_000 });
    const a = await paid(session.id, 1);
    const b = await paid(session.id, 2);

    // A working email provider: the claim must then stay in place.
    process.env.RESEND_API_KEY = "test-key";
    process.env.EMAIL_FROM = "Flower Season <hello@example.com>";
    const originalFetch = globalThis.fetch;
    let resendCalls = 0;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      if (String(input).includes("resend.com")) resendCalls += 1;
      return new Response("{}", { status: 200 });
    }) as typeof fetch;

    try {
      const [first, second] = await Promise.all([
        sendDueReminders(db, now),
        sendDueReminders(db, now),
      ]);
      assert.equal(first.sent + second.sent, 2);
    } finally {
      globalThis.fetch = originalFetch;
      delete process.env.RESEND_API_KEY;
      delete process.env.EMAIL_FROM;
      restore();
    }
    assert.equal(resendCalls, 2, "one email per guest, not per run");
    assert.ok(await sentAt(a.id));
    assert.ok(await sentAt(b.id));
  });
});
