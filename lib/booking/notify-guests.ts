import { sendEmail } from "../email.ts";
import type { Booking, Session } from "../db/schema.ts";
import { siteUrl } from "../site.ts";
import { cancellationEmail, rescheduleEmail } from "./messages.ts";

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
async function sendAll(emails: Parameters<typeof sendEmail>[0][]): Promise<Summary> {
  let sent = 0;
  let failed = 0;
  for (const email of emails) {
    if (await sendEmail(email)) sent += 1;
    else failed += 1;
  }
  return { sent, failed };
}

export function notifyRescheduled(
  guests: Booking[],
  session: Pick<Session, "startsAt">,
  oldStartsAt: Date,
): Promise<Summary> {
  return sendAll(
    guests.map((g) => rescheduleEmail(detailsOf(g, session.startsAt), oldStartsAt, statusUrl(g))),
  );
}

export function notifyCancelled(
  guests: Booking[],
  session: Pick<Session, "startsAt">,
): Promise<Summary> {
  return sendAll(
    guests.map((g) => cancellationEmail(detailsOf(g, session.startsAt), statusUrl(g))),
  );
}
