import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";
import { sql } from "drizzle-orm";
import { createDb, type Db } from "../lib/db/index.ts";
import { runMigrations } from "../lib/db/migrate.ts";
import { sessions } from "../lib/db/schema.ts";
import { createBooking, listUpcomingSessions, markPaid } from "../lib/booking/service.ts";

const url = process.env.TEST_DATABASE_URL;
describe("pay after request", { skip: !url && "TEST_DATABASE_URL is not set" }, () => {
  let db: Db;
  before(async () => { await runMigrations(url!); db = createDb(url!, 12); });
  after(async () => { await db.$client.end(); });
  beforeEach(async () => { await db.execute(sql`truncate bookings, sessions, bot_drafts`); });

  test("unpaid requests do not reduce free places; payment cannot oversell", async () => {
    const [session] = await db.insert(sessions).values({ startsAt: new Date("2026-12-12T09:00:00Z"), capacity: 2, priceKop: 290_000 }).returning();
    const first = await createBooking(db, { sessionId: session.id, name: "Оля", phone: "+380501111111", messenger: "Telegram", comment: "", seats: 2 }, new Date("2026-11-18"));
    const second = await createBooking(db, { sessionId: session.id, name: "Іра", phone: "+380502222222", messenger: "Viber", comment: "", seats: 1 }, new Date("2026-11-18"));
    assert.equal(first.ok, true); assert.equal(second.ok, true);
    assert.equal((await listUpcomingSessions(db, new Date("2026-11-18")))[0].seatsLeft, 2);
    if (!first.ok || !second.ok) return;
    assert.ok(await markPaid(db, first.booking.id));
    assert.equal(await markPaid(db, second.booking.id), undefined);
    assert.equal((await listUpcomingSessions(db, new Date("2026-11-18")))[0].seatsLeft, 0);
  });

  test("simultaneous payment confirmations cannot exceed capacity", async () => {
    const [session] = await db.insert(sessions).values({ startsAt: new Date("2026-12-19T09:00:00Z"), capacity: 1, priceKop: 290_000 }).returning();
    const a = await createBooking(db, { sessionId: session.id, name: "А", phone: "+380503333333", messenger: "Telegram", comment: "", seats: 1 }, new Date("2026-11-18"));
    const b = await createBooking(db, { sessionId: session.id, name: "Б", phone: "+380504444444", messenger: "Viber", comment: "Побажання", seats: 1 }, new Date("2026-11-18"));
    assert.equal(a.ok, true); assert.equal(b.ok, true);
    if (!a.ok || !b.ok) return;
    const confirmations = await Promise.all([markPaid(db, a.booking.id), markPaid(db, b.booking.id)]);
    assert.equal(confirmations.filter(Boolean).length, 1);
    assert.equal((await listUpcomingSessions(db, new Date("2026-11-18")))[0].seatsLeft, 0);
    assert.equal(b.booking.messenger, "Viber");
    assert.equal(b.booking.comment, "Побажання");
  });
});
