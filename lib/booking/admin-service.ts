import { and, desc, eq, gt, gte, inArray, ne, sql } from "drizzle-orm";
import type { Db } from "../db/index.ts";
import {
  botDrafts,
  bookings,
  sessions,
  type Booking,
  type Session,
  type SessionStatus,
} from "../db/schema.ts";
import { seatsTakenInSession } from "./service.ts";

const PAID = sql`${bookings.status} in ('paid', 'needs_attention')`;

export const DEFAULT_DURATION_MIN = 120;

export async function createSession(
  db: Db,
  input: { startsAt: Date; capacity: number; priceKop: number; durationMin?: number },
): Promise<Session> {
  const [session] = await db
    .insert(sessions)
    .values({
      startsAt: input.startsAt,
      capacity: input.capacity,
      priceKop: input.priceKop,
      durationMin: input.durationMin ?? DEFAULT_DURATION_MIN,
    })
    .returning();
  return session;
}

// "cancelled" is final: a cancelled date can never be reopened by accident.
export async function setSessionStatus(
  db: Db,
  sessionId: string,
  status: SessionStatus,
): Promise<Session | undefined> {
  const [session] = await db
    .update(sessions)
    .set({ status })
    .where(and(eq(sessions.id, sessionId), ne(sessions.status, "cancelled")))
    .returning();
  return session;
}

export type SessionPatch = {
  startsAt?: Date;
  priceKop?: number;
  durationMin?: number;
};

// Changes time, price or duration of a date that is not cancelled.
// The price only applies to NEW bookings: what existing guests paid is stored
// on their booking. When the start moves, reminders are re-armed so guests get
// a reminder for the new time rather than none (or a stale one).
export async function updateSession(
  db: Db,
  sessionId: string,
  patch: SessionPatch,
): Promise<Session | undefined> {
  return db.transaction(async (tx) => {
    const [session] = await tx
      .update(sessions)
      .set(patch)
      .where(and(eq(sessions.id, sessionId), ne(sessions.status, "cancelled")))
      .returning();
    if (session && patch.startsAt) {
      await tx
        .update(bookings)
        .set({ reminderSentAt: null })
        .where(eq(bookings.sessionId, sessionId));
    }
    return session;
  });
}

export async function getBooking(db: Db, bookingId: string): Promise<Booking | undefined> {
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
  return booking;
}

// Cancels a paid booking: the seats are released and it leaves the revenue.
// The money itself is refunded by hand in the bank cabinet.
export async function cancelBooking(
  db: Db,
  bookingId: string,
): Promise<Booking | undefined> {
  const [booking] = await db
    .update(bookings)
    .set({ status: "cancelled" })
    .where(and(eq(bookings.id, bookingId), inArray(bookings.status, ["paid", "needs_attention"])))
    .returning();
  return booking;
}

export type UpdateCapacityResult =
  | { ok: true; session: Session }
  | { ok: false; reason: "not_found" | "too_low"; seatsTaken?: number };

// The capacity can never drop below the seats that are already sold or held.
export async function updateCapacity(
  db: Db,
  sessionId: string,
  capacity: number,
  now: Date = new Date(),
): Promise<UpdateCapacityResult> {
  return db.transaction(async (tx) => {
    const [session] = await tx
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .for("update");
    if (!session) return { ok: false, reason: "not_found" } as const;

    const taken = await seatsTakenInSession(tx, sessionId, now);
    if (capacity < taken) {
      return { ok: false, reason: "too_low", seatsTaken: taken } as const;
    }

    const [updated] = await tx
      .update(sessions)
      .set({ capacity })
      .where(eq(sessions.id, sessionId))
      .returning();
    return { ok: true, session: updated } as const;
  });
}

export type AdminSession = Session & {
  paidSeats: number;
  heldSeats: number;
  revenueKop: number;
};

const adminSessionColumns = (now: Date) => ({
  session: sessions,
  paidSeats: sql<number>`coalesce(sum(${bookings.seats}) filter (where ${PAID}), 0)::int`,
  heldSeats: sql<number>`coalesce(sum(${bookings.seats}) filter (where ${bookings.status} = 'pending' and ${bookings.holdExpiresAt} > ${now.toISOString()}::timestamptz), 0)::int`,
  revenueKop: sql<number>`coalesce(sum(${bookings.amountKop}) filter (where ${PAID}), 0)::int`,
});

// Upcoming dates (open and closed, not cancelled) for the owner's schedule.
export async function listAdminSessions(
  db: Db,
  now: Date = new Date(),
): Promise<AdminSession[]> {
  const rows = await db
    .select(adminSessionColumns(now))
    .from(sessions)
    .leftJoin(bookings, eq(bookings.sessionId, sessions.id))
    .where(and(gt(sessions.startsAt, now), ne(sessions.status, "cancelled")))
    .groupBy(sessions.id)
    .orderBy(sessions.startsAt)
    .limit(30);
  return rows.map(({ session, ...counts }) => ({ ...session, ...counts }));
}

export async function getAdminSession(
  db: Db,
  sessionId: string,
  now: Date = new Date(),
): Promise<AdminSession | undefined> {
  const [row] = await db
    .select(adminSessionColumns(now))
    .from(sessions)
    .leftJoin(bookings, eq(bookings.sessionId, sessions.id))
    .where(eq(sessions.id, sessionId))
    .groupBy(sessions.id);
  if (!row) return undefined;
  const { session, ...counts } = row;
  return { ...session, ...counts };
}

export async function getParticipants(
  db: Db,
  sessionId: string,
): Promise<Booking[]> {
  return db
    .select()
    .from(bookings)
    .where(and(eq(bookings.sessionId, sessionId), inArray(bookings.status, ["paid", "needs_attention"])))
    .orderBy(bookings.createdAt);
}

export type Analytics = {
  paidBookings: number;
  paidSeats: number;
  revenueKop: number;
  last7DaysRevenueKop: number;
  last7DaysSeats: number;
  createdBookings: number;
  abandonedBookings: number;
  needsAttention: number;
  perDay: { day: string; revenueKop: number; seats: number }[];
};

export async function getAnalytics(
  db: Db,
  now: Date = new Date(),
): Promise<Analytics> {
  const nowIso = now.toISOString();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60_000).toISOString();

  const [totals] = await db
    .select({
      paidBookings: sql<number>`count(*) filter (where ${PAID})::int`,
      paidSeats: sql<number>`coalesce(sum(${bookings.seats}) filter (where ${PAID}), 0)::int`,
      revenueKop: sql<number>`coalesce(sum(${bookings.amountKop}) filter (where ${PAID}), 0)::int`,
      last7DaysRevenueKop: sql<number>`coalesce(sum(${bookings.amountKop}) filter (where ${PAID} and ${bookings.paidAt} >= ${weekAgo}::timestamptz), 0)::int`,
      last7DaysSeats: sql<number>`coalesce(sum(${bookings.seats}) filter (where ${PAID} and ${bookings.paidAt} >= ${weekAgo}::timestamptz), 0)::int`,
      createdBookings: sql<number>`count(*)::int`,
      // Abandoned = the customer started checkout and never paid: the hold ran
      // out, or the invoice could not be created.
      abandonedBookings: sql<number>`count(*) filter (where ${bookings.status} in ('expired', 'failed') or (${bookings.status} = 'pending' and ${bookings.holdExpiresAt} <= ${nowIso}::timestamptz))::int`,
      needsAttention: sql<number>`count(*) filter (where ${bookings.status} = 'needs_attention')::int`,
    })
    .from(bookings);

  const days = await db
    .select({
      day: sql<string>`to_char(${bookings.paidAt} at time zone 'Europe/Kyiv', 'YYYY-MM-DD')`,
      revenueKop: sql<number>`sum(${bookings.amountKop})::int`,
      seats: sql<number>`sum(${bookings.seats})::int`,
    })
    .from(bookings)
    .where(and(sql`${PAID}`, gte(bookings.paidAt, new Date(weekAgo))))
    .groupBy(sql`1`)
    .orderBy(desc(sql`1`));

  return { ...totals, perDay: days };
}

// --- Wizard state of the Telegram bot ------------------------------------

const DRAFT_TTL_MS = 60 * 60_000;

export type Draft = { step: string; data: Record<string, unknown> };

export async function getDraft(
  db: Db,
  chatId: number,
  now: Date = new Date(),
): Promise<Draft | undefined> {
  const [draft] = await db.select().from(botDrafts).where(eq(botDrafts.chatId, chatId));
  if (!draft) return undefined;
  // A half-finished form from yesterday would only confuse the owner.
  if (now.getTime() - draft.updatedAt.getTime() > DRAFT_TTL_MS) {
    await clearDraft(db, chatId);
    return undefined;
  }
  return { step: draft.step, data: draft.data };
}

export async function saveDraft(
  db: Db,
  chatId: number,
  step: string,
  data: Record<string, unknown>,
): Promise<void> {
  await db
    .insert(botDrafts)
    .values({ chatId, step, data })
    .onConflictDoUpdate({
      target: botDrafts.chatId,
      set: { step, data, updatedAt: new Date() },
    });
}

export async function clearDraft(db: Db, chatId: number): Promise<void> {
  await db.delete(botDrafts).where(eq(botDrafts.chatId, chatId));
}
