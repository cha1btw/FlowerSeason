import { and, eq, gt, isNull, lte, ne, sql } from "drizzle-orm";
import { notifyAdmins } from "../admin.ts";
import type { Db } from "../db/index.ts";
import { sendEmail } from "../email.ts";
import { bookings, sessions } from "../db/schema.ts";
import { siteUrl } from "../site.ts";
import { escapeTelegramHtml } from "../telegram.ts";
import { formatSessionDate, formatSessionTime } from "../time.ts";
import { pluralSeats } from "../format.ts";
import { reminderEmail } from "./messages.ts";

// The cron job runs once a day, so "36 hours ahead" covers everything that
// starts before the next run: each class gets exactly one reminder, sent
// between roughly 12 and 36 hours before it begins.
export const REMINDER_WINDOW_HOURS = 36;

export type ReminderSummary = { sent: number; failed: number };

export async function sendDueReminders(
  db: Db,
  now: Date = new Date(),
): Promise<ReminderSummary> {
  const until = new Date(now.getTime() + REMINDER_WINDOW_HOURS * 60 * 60_000);

  const due = await db
    .select({ booking: bookings, session: sessions })
    .from(bookings)
    .innerJoin(sessions, eq(sessions.id, bookings.sessionId))
    .where(
      and(
        eq(bookings.status, "paid"),
        isNull(bookings.reminderSentAt),
        ne(sessions.status, "cancelled"),
        gt(sessions.startsAt, now),
        lte(sessions.startsAt, until),
      ),
    )
    .orderBy(sessions.startsAt);

  let sent = 0;
  let failed = 0;
  const perSession = new Map<string, { startsAt: Date; people: number; seats: number }>();

  for (const { booking, session } of due) {
    // Claim first, send second: if two cron runs overlap, only one gets the row.
    const claimed = await db
      .update(bookings)
      .set({ reminderSentAt: now })
      .where(and(eq(bookings.id, booking.id), isNull(bookings.reminderSentAt)))
      .returning({ id: bookings.id });
    if (claimed.length === 0) continue;

    const ok = await sendEmail(
      reminderEmail(
        {
          name: booking.name,
          email: booking.email,
          phone: booking.phone,
          seats: booking.seats,
          amountKop: booking.amountKop,
          startsAt: session.startsAt,
        },
        `${siteUrl()}/workshops/booking/${booking.id}`,
      ),
    );

    if (ok) {
      sent += 1;
      const entry = perSession.get(session.id) ?? { startsAt: session.startsAt, people: 0, seats: 0 };
      entry.people += 1;
      entry.seats += booking.seats;
      perSession.set(session.id, entry);
    } else {
      failed += 1;
      // Release the claim so tomorrow's run tries this guest again.
      await db
        .update(bookings)
        .set({ reminderSentAt: sql`null` })
        .where(eq(bookings.id, booking.id));
    }
  }

  if (perSession.size > 0 || failed > 0) {
    const lines = ["📨 <b>Нагадування надіслано</b>"];
    for (const entry of perSession.values()) {
      lines.push(
        `${escapeTelegramHtml(formatSessionDate(entry.startsAt))} ${formatSessionTime(entry.startsAt)} · ${entry.people} учасн. · ${escapeTelegramHtml(pluralSeats(entry.seats))}`,
      );
    }
    if (failed > 0) lines.push(`⚠️ Не вдалося надіслати: ${failed}. Спробуємо ще раз завтра.`);
    await notifyAdmins(lines.join("\n"));
  }

  return { sent, failed };
}
