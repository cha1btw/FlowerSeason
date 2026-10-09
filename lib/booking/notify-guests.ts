import type { Db } from "../db/index.ts";
import { sendEmail } from "../email.ts";
import type { Booking, Session } from "../db/schema.ts";
import { siteUrl } from "../site.ts";
import { emailFor, type TemplateKey } from "./email-templates.ts";

type Summary = { sent: number; failed: number };

const detailsOf = (booking: Booking, startsAt: Date) => ({
  name: booking.name,
  email: booking.email,
  phone: booking.phone,
  seats: booking.seats,
  amountKop: booking.amountKop,
  startsAt,
});

const statusUrl = (booking: Booking) => `${siteUrl()}/workshops/booking/${booking.id}`;

// One at a time: a class has a handful of guests, and email providers
// rate-limit bursts.
async function sendAll(
  db: Db,
  key: TemplateKey,
  guests: Booking[],
  startsAt: Date,
  oldStartsAt?: Date,
): Promise<Summary> {
  let sent = 0;
  let failed = 0;
  for (const guest of guests) {
    const email = await emailFor(db, key, detailsOf(guest, startsAt), statusUrl(guest), oldStartsAt);
    if (await sendEmail(email)) sent += 1;
    else failed += 1;
  }
  return { sent, failed };
}

export function notifyRescheduled(
  db: Db,
  guests: Booking[],
  session: Pick<Session, "startsAt">,
  oldStartsAt: Date,
): Promise<Summary> {
  return sendAll(db, "reschedule", guests, session.startsAt, oldStartsAt);
}

export function notifyCancelled(
  db: Db,
  guests: Booking[],
  session: Pick<Session, "startsAt">,
): Promise<Summary> {
  return sendAll(db, "cancelled", guests, session.startsAt);
}
